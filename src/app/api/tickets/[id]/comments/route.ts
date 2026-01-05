import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  isInternal: z.boolean().optional(),
  attachmentIds: z.array(z.string()).optional(),
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

    // Use transaction to create comment and link attachments
    const comment = await prisma.$transaction(async (tx) => {
      // Create the comment
      const newComment = await tx.ticketComment.create({
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

      // Link attachments to comment if provided
      if (validatedData.attachmentIds && validatedData.attachmentIds.length > 0) {
        await tx.ticketAttachment.updateMany({
          where: {
            id: { in: validatedData.attachmentIds },
            ticketId: id,
            uploadedById: session.user.id,
            commentId: null, // Only update unlinked attachments
          },
          data: {
            commentId: newComment.id,
          },
        })
      }

      // Fetch comment with attachments
      return tx.ticketComment.findUnique({
        where: { id: newComment.id },
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
      })
    })

    if (!comment) {
      throw new Error("Failed to create comment")
    }

    return NextResponse.json({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      attachments: comment.attachments.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
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

