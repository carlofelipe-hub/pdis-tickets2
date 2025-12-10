import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/pm/tickets - Get tickets awaiting assignment (SUBMITTED status)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only PROJECT_MANAGERs can access this
    if (session.user.ticketRole !== "PROJECT_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "SUBMITTED"

    // Get tickets based on status filter
    const whereClause = status === "all" 
      ? { status: { not: "CANCELLED" as const } }
      : { status: status as "SUBMITTED" | "DEV_IN_PROGRESS" | "QA_TESTING" | "PD_TESTING" | "FOR_DEPLOYMENT" | "DEPLOYED" }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      orderBy: [
        { priority: "desc" },
        { createdAt: "asc" },
      ],
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            office: true,
          },
        },
        processOwner: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedDeveloper: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedQa: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({
      tickets: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        contactEmail: t.contactEmail,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        submittedAt: t.submittedAt?.toISOString() || null,
        submitter: t.submitter,
        processOwner: t.processOwner,
        assignedDeveloper: t.assignedDeveloper,
        assignedQa: t.assignedQa,
      })),
    })
  } catch (error) {
    console.error("Error fetching PM tickets:", error)
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    )
  }
}
