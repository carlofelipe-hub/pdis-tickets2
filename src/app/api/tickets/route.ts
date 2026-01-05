import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { TicketCategory, TicketPriority, TicketStatus, Prisma } from "@prisma/client"
import { buildUserTicketsWhereClause } from "@/lib/ticket-filters"
import { canCreateTickets, getAccessDenialReason } from "@/lib/access-control"

const createTicketSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20),
  category: z.enum(["BUG", "FEATURE_REQUEST", "OTHER"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  stepsToReproduce: z.string().optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
})

// Generate ticket number
async function generateTicketNumber(): Promise<string> {
  const today = new Date()
  const year = today.getFullYear().toString().slice(-2)
  const month = (today.getMonth() + 1).toString().padStart(2, "0")
  const prefix = `TKT-${year}${month}`

  // Find the last ticket number for this month
  const lastTicket = await prisma.ticket.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      ticketNumber: "desc",
    },
    select: {
      ticketNumber: true,
    },
  })

  let sequence = 1
  if (lastTicket) {
    const lastSequence = parseInt(lastTicket.ticketNumber.split("-")[2], 10)
    sequence = lastSequence + 1
  }

  return `${prefix}-${sequence.toString().padStart(4, "0")}`
}

// GET /api/tickets - List user's tickets
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "10", 10)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const category = searchParams.get("category")

    const skip = (page - 1) * limit

    // Build base WHERE clause based on user role and assignments
    const userId = session.user.id
    const ticketRole = session.user.ticketRole
    const roleFilter = buildUserTicketsWhereClause(userId, ticketRole)

    // Combine role-based filter with search and other filters
    const where: Prisma.TicketWhereInput = {
      AND: [
        roleFilter, // Role-based access control
        ...(search
          ? [
              {
                OR: [
                  { title: { contains: search, mode: "insensitive" as const } },
                  { ticketNumber: { contains: search, mode: "insensitive" as const } },
                  { description: { contains: search, mode: "insensitive" as const } },
                ],
              },
            ]
          : []),
      ],
      ...(status && { status: status as TicketStatus }),
      ...(priority && { priority: priority as TicketPriority }),
      ...(category && { category: category as TicketCategory }),
    }

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          priority: true,
          category: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.ticket.count({ where }),
    ])

    return NextResponse.json({
      tickets: tickets.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error("Error fetching tickets:", error)
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    )
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user can create tickets
    if (!canCreateTickets(session.user.email)) {
      return NextResponse.json(
        { error: getAccessDenialReason('create') },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createTicketSchema.parse(body)

    const ticketNumber = await generateTicketNumber()

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        priority: validatedData.priority,
        stepsToReproduce: validatedData.stepsToReproduce || null,
        contactEmail: validatedData.contactEmail,
        contactPhone: validatedData.contactPhone || null,
        submitterId: session.user.id,
        status: "FOR_PD_APPROVAL",
      },
    })

    // Create initial status history entry
    await prisma.ticketStatusHistory.create({
      data: {
        ticketId: ticket.id,
        fromStatus: null,
        toStatus: "FOR_PD_APPROVAL",
        changedById: session.user.id,
        reason: "Ticket created",
      },
    })

    return NextResponse.json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
    })
  } catch (error) {
    console.error("Error creating ticket:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    )
  }
}

