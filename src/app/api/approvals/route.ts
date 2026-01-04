import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isTicketApprover, getAccessDenialReason } from "@/lib/access-control"

// GET /api/approvals - Get pending tickets for approval
export async function GET() {
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

    // Get all tickets awaiting approval
    const tickets = await prisma.ticket.findMany({
      where: {
        status: "FOR_PD_APPROVAL",
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "asc" },
      ],
      include: {
        submitter: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            office: true,
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
        contactEmail: t.contactEmail,
        createdAt: t.createdAt.toISOString(),
        submitter: t.submitter,
      })),
    })
  } catch (error) {
    console.error("Error fetching pending approvals:", error)
    return NextResponse.json(
      { error: "Failed to fetch pending approvals" },
      { status: 500 }
    )
  }
}

