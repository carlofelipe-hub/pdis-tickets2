import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isTicketApprover, getAccessDenialReason } from "@/lib/access-control"

const approvalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
})

// POST /api/approvals/[id] - Approve or reject a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is an approver (email-based)
    if (!isTicketApprover(session.user.email)) {
      return NextResponse.json(
        { error: getAccessDenialReason('approve') },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { action, reason } = approvalSchema.parse(body)

    // Get the ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    if (ticket.status !== "FOR_PD_APPROVAL") {
      return NextResponse.json(
        { error: "Ticket is not pending approval" },
        { status: 400 }
      )
    }

    if (action === "approve") {
      // Approve the ticket
      const updatedTicket = await prisma.ticket.update({
        where: { id },
        data: {
          status: "SUBMITTED",
          processOwnerId: session.user.id,
          submittedAt: new Date(),
        },
      })

      // Add status history entry
      await prisma.ticketStatusHistory.create({
        data: {
          ticketId: id,
          fromStatus: "FOR_PD_APPROVAL",
          toStatus: "SUBMITTED",
          changedById: session.user.id,
          reason: reason || "Approved by process owner",
        },
      })

      return NextResponse.json({
        success: true,
        ticket: {
          id: updatedTicket.id,
          status: updatedTicket.status,
        },
      })
    } else {
      // Reject the ticket (cancel it)
      if (!reason) {
        return NextResponse.json(
          { error: "Rejection reason is required" },
          { status: 400 }
        )
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id },
        data: {
          status: "CANCELLED",
          processOwnerId: session.user.id,
          cancelledAt: new Date(),
          cancelledById: session.user.id,
          cancellationReason: reason,
        },
      })

      // Add status history entry
      await prisma.ticketStatusHistory.create({
        data: {
          ticketId: id,
          fromStatus: "FOR_PD_APPROVAL",
          toStatus: "CANCELLED",
          changedById: session.user.id,
          reason,
        },
      })

      return NextResponse.json({
        success: true,
        ticket: {
          id: updatedTicket.id,
          status: updatedTicket.status,
        },
      })
    }
  } catch (error) {
    console.error("Error processing approval:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 }
    )
  }
}

