import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/approvals - Get pending tickets for approval
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only process owners can view pending approvals
    const isProcessOwner = 
      session.user.isDepartmentHead ||
      session.user.isOfficeHead ||
      session.user.isGroupDirector

    if (!isProcessOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

