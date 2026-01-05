import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/tickets/[id] - Get ticket details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
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
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                image: true,
              },
            },
            attachments: {
              select: {
                id: true,
                fileName: true,
                fileUrl: true,
                fileSize: true,
                fileType: true,
                createdAt: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          include: {
            changedBy: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Only the submitter, process owner, assigned dev, QA, project manager, or leadership can view
    const canView =
      ticket.submitterId === session.user.id ||
      ticket.processOwnerId === session.user.id ||
      ticket.assignedDeveloperId === session.user.id ||
      ticket.assignedQaId === session.user.id ||
      session.user.isDepartmentHead ||
      session.user.isOfficeHead ||
      session.user.isGroupDirector ||
      session.user.ticketRole === "PROJECT_MANAGER"

    if (!canView) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      ...ticket,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      submittedAt: ticket.submittedAt?.toISOString() || null,
      cancelledAt: ticket.cancelledAt?.toISOString() || null,
      deployedAt: ticket.deployedAt?.toISOString() || null,
      comments: ticket.comments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        attachments: c.attachments.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
        })),
      })),
      statusHistory: ticket.statusHistory.map((h) => ({
        ...h,
        createdAt: h.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error fetching ticket:", error)
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    )
  }
}

// PATCH /api/tickets/[id] - Update ticket (cancel)
export async function PATCH(
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

    const ticket = await prisma.ticket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Only the submitter can cancel and only when FOR_PD_APPROVAL
    if (body.status === "CANCELLED") {
      if (ticket.submitterId !== session.user.id) {
        return NextResponse.json(
          { error: "Only the ticket submitter can cancel" },
          { status: 403 }
        )
      }

      if (ticket.status !== "FOR_PD_APPROVAL") {
        return NextResponse.json(
          { error: "Can only cancel tickets awaiting approval" },
          { status: 400 }
        )
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: session.user.id,
          cancellationReason: body.reason || "Cancelled by submitter",
        },
        include: {
          submitter: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              image: true,
            },
          },
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  image: true,
                },
              },
              attachments: {
                select: {
                  id: true,
                  fileName: true,
                  fileUrl: true,
                  fileSize: true,
                  fileType: true,
                  createdAt: true,
                },
              },
            },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
            include: {
              changedBy: {
                select: {
                  name: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      })

      // Add status history entry
      await prisma.ticketStatusHistory.create({
        data: {
          ticketId: id,
          fromStatus: "FOR_PD_APPROVAL",
          toStatus: "CANCELLED",
          changedById: session.user.id,
          reason: body.reason || "Cancelled by submitter",
        },
      })

      return NextResponse.json({
        ...updatedTicket,
        createdAt: updatedTicket.createdAt.toISOString(),
        updatedAt: updatedTicket.updatedAt.toISOString(),
        cancelledAt: updatedTicket.cancelledAt?.toISOString() || null,
      })
    }

    return NextResponse.json({ error: "Invalid update" }, { status: 400 })
  } catch (error) {
    console.error("Error updating ticket:", error)
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    )
  }
}

