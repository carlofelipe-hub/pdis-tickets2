import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  isInternal: z.boolean().optional(),
})

// POST /api/tickets/[id]/comments - Add a comment
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
    const validatedData = createCommentSchema.parse(body)

    // Check if ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Check if user can comment
    const canComment = 
      ticket.submitterId === session.user.id ||
      ticket.processOwnerId === session.user.id ||
      ticket.assignedDeveloperId === session.user.id ||
      ticket.assignedQaId === session.user.id ||
      session.user.isDepartmentHead ||
      session.user.isOfficeHead ||
      session.user.isGroupDirector

    if (!canComment) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Only internal staff can create internal comments
    const isInternalStaff = 
      session.user.isDepartmentHead ||
      session.user.isOfficeHead ||
      session.user.isGroupDirector ||
      ticket.assignedDeveloperId === session.user.id ||
      ticket.assignedQaId === session.user.id

    const isInternal = validatedData.isInternal && isInternalStaff

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: id,
        userId: session.user.id,
        content: validatedData.content,
        isInternal,
      },
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
      },
    })

    return NextResponse.json({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error("Error creating comment:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    )
  }
}

