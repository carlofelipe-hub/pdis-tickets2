import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TicketStatus } from "@prisma/client"
import { z } from "zod"
import { isTicketApprover } from "@/lib/access-control"

const updateStatusSchema = z.object({
  newStatus: z.enum(["QA_TESTING", "PD_TESTING", "FOR_DEPLOYMENT", "DEPLOYED"]),
  reason: z.string().optional(),
})

interface ValidationResult {
  valid: boolean
  error?: string
  status?: number
}

// POST /api/tickets/[id]/status - Update ticket status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { newStatus, reason } = updateStatusSchema.parse(body)

    // Get the ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        assignedDeveloper: true,
        assignedQa: true,
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Validate status transition and permissions
    const validationResult = validateStatusTransition(
      ticket.status,
      newStatus,
      session.user,
      ticket
    )

    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: validationResult.status || 400 }
      )
    }

    // Build update data
    const updateData: {
      status: TicketStatus
      deployedAt?: Date
    } = {
      status: newStatus as TicketStatus,
    }

    // Set deployedAt for DEPLOYED status
    if (newStatus === "DEPLOYED") {
      updateData.deployedAt = new Date()
    }

    // Update the ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
    })

    // Create status history entry
    await prisma.ticketStatusHistory.create({
      data: {
        ticketId: id,
        fromStatus: ticket.status,
        toStatus: newStatus,
        changedById: session.user.id,
        reason: reason || generateDefaultReason(newStatus, session.user),
      },
    })

    return NextResponse.json({
      success: true,
      ticket: {
        id: updatedTicket.id,
        status: updatedTicket.status,
        updatedAt: updatedTicket.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Error updating ticket status:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update ticket status" },
      { status: 500 }
    )
  }
}

function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  user: any,
  ticket: any
): ValidationResult {
  // DEV_IN_PROGRESS → QA_TESTING
  if (currentStatus === "DEV_IN_PROGRESS" && newStatus === "QA_TESTING") {
    // Check if QA is assigned
    if (!ticket.assignedQaId) {
      return {
        valid: false,
        error: "A QA tester must be assigned before moving to QA Testing",
        status: 400,
      }
    }

    // Check permission
    const isDeveloper = ticket.assignedDeveloperId === user.id
    const isPM = user.ticketRole === "PROJECT_MANAGER"

    if (!isDeveloper && !isPM) {
      return {
        valid: false,
        error: "Only the assigned developer or project manager can move to QA Testing",
        status: 403,
      }
    }

    return { valid: true }
  }

  // QA_TESTING → PD_TESTING
  if (currentStatus === "QA_TESTING" && newStatus === "PD_TESTING") {
    const isQA = ticket.assignedQaId === user.id
    const isPM = user.ticketRole === "PROJECT_MANAGER"

    if (!isQA && !isPM) {
      return {
        valid: false,
        error: "Only the assigned QA or project manager can move to PD Testing",
        status: 403,
      }
    }

    return { valid: true }
  }

  // PD_TESTING → FOR_DEPLOYMENT
  if (currentStatus === "PD_TESTING" && newStatus === "FOR_DEPLOYMENT") {
    const isApprover = isTicketApprover(user.email)
    const isProcessOwner =
      user.isDepartmentHead || user.isOfficeHead || user.isGroupDirector
    const isPM = user.ticketRole === "PROJECT_MANAGER"

    if (!isApprover && !isProcessOwner && !isPM) {
      return {
        valid: false,
        error:
          "Only approvers, process owners, or project managers can approve for deployment",
        status: 403,
      }
    }

    return { valid: true }
  }

  // FOR_DEPLOYMENT → DEPLOYED
  if (currentStatus === "FOR_DEPLOYMENT" && newStatus === "DEPLOYED") {
    if (user.ticketRole !== "PROJECT_MANAGER") {
      return {
        valid: false,
        error: "Only project managers can mark tickets as deployed",
        status: 403,
      }
    }

    return { valid: true }
  }

  return {
    valid: false,
    error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
    status: 400,
  }
}

function generateDefaultReason(newStatus: string, user: any): string {
  switch (newStatus) {
    case "QA_TESTING":
      return "Development completed, ready for QA testing"
    case "PD_TESTING":
      return "QA testing completed, ready for PD testing"
    case "FOR_DEPLOYMENT":
      return "PD testing approved, ready for deployment"
    case "DEPLOYED":
      return "Deployed to production"
    default:
      return `Status updated to ${newStatus}`
  }
}
