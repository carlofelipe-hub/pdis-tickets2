import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildUserTicketsWhereClause } from "@/lib/ticket-filters"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const ticketRole = session.user.ticketRole

    // Build base WHERE clause based on user role and assignments
    const baseWhere = buildUserTicketsWhereClause(userId, ticketRole)

    // Get ticket stats for the user
    const [total, forApproval, inProgress, completed, recentTickets] = await Promise.all([
      // Total tickets (excluding cancelled from count)
      prisma.ticket.count({
        where: {
          ...baseWhere,
          status: { not: "CANCELLED" },
        },
      }),
      // Tickets awaiting approval
      prisma.ticket.count({
        where: {
          ...baseWhere,
          status: "FOR_PD_APPROVAL",
        },
      }),
      // Tickets in progress (submitted, dev, qa, pd testing)
      prisma.ticket.count({
        where: {
          ...baseWhere,
          status: {
            in: ["SUBMITTED", "DEV_IN_PROGRESS", "QA_TESTING", "PD_TESTING", "FOR_DEPLOYMENT"],
          },
        },
      }),
      // Completed tickets
      prisma.ticket.count({
        where: {
          ...baseWhere,
          status: "DEPLOYED",
        },
      }),
      // Recent tickets (including all statuses except cancelled)
      prisma.ticket.findMany({
        where: {
          ...baseWhere,
          status: { not: "CANCELLED" },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          priority: true,
          category: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      stats: {
        total,
        forApproval,
        inProgress,
        completed,
      },
      recentTickets: recentTickets.map((ticket) => ({
        ...ticket,
        createdAt: ticket.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}

