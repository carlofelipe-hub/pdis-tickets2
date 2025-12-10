import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const assignSchema = z.object({
  developerId: z.string().optional(),
  qaId: z.string().optional(),
  startDevelopment: z.boolean().optional(),
})

// POST /api/pm/tickets/[id]/assign - Assign developer and/or QA to a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only PROJECT_MANAGERs can assign
    if (session.user.ticketRole !== "PROJECT_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { developerId, qaId, startDevelopment } = assignSchema.parse(body)

    // Get the ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Validate that the ticket is in a valid state for assignment
    const validStatuses = ["SUBMITTED", "DEV_IN_PROGRESS", "QA_TESTING", "PD_TESTING"]
    if (!validStatuses.includes(ticket.status)) {
      return NextResponse.json(
        { error: "Ticket cannot be assigned in its current status" },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: {
      assignedDeveloperId?: string | null
      assignedQaId?: string | null
      status?: "DEV_IN_PROGRESS"
    } = {}

    if (developerId !== undefined) {
      // Verify developer exists and has DEVELOPER role
      if (developerId) {
        const developer = await prisma.user.findUnique({
          where: { id: developerId },
          select: { ticketRole: true },
        })
        if (!developer || developer.ticketRole !== "DEVELOPER") {
          return NextResponse.json(
            { error: "Invalid developer selected" },
            { status: 400 }
          )
        }
      }
      updateData.assignedDeveloperId = developerId || null
    }

    if (qaId !== undefined) {
      // Verify QA exists and has QA role
      if (qaId) {
        const qa = await prisma.user.findUnique({
          where: { id: qaId },
          select: { ticketRole: true },
        })
        if (!qa || qa.ticketRole !== "QA") {
          return NextResponse.json(
            { error: "Invalid QA selected" },
            { status: 400 }
          )
        }
      }
      updateData.assignedQaId = qaId || null
    }

    // If starting development, change status
    if (startDevelopment && ticket.status === "SUBMITTED") {
      updateData.status = "DEV_IN_PROGRESS"
    }

    // Update the ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
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

    // Add status history if status changed
    if (updateData.status) {
      await prisma.ticketStatusHistory.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status as "SUBMITTED",
          toStatus: updateData.status,
          changedById: session.user.id,
          reason: "Development started by Project Manager",
        },
      })
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: updatedTicket.id,
        status: updatedTicket.status,
        assignedDeveloper: updatedTicket.assignedDeveloper,
        assignedQa: updatedTicket.assignedQa,
      },
    })
  } catch (error) {
    console.error("Error assigning ticket:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to assign ticket" },
      { status: 500 }
    )
  }
}
