import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadToCloudinary } from "@/lib/cloudinary"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
]

// POST /api/tickets/[id]/comments/attachments - Upload attachment for comment
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

    // Check if ticket exists and user has permission to comment
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Check if user can comment (same permissions as commenting)
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

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Cloudinary (temporary folder until comment is created)
    const result = await uploadToCloudinary(buffer, {
      folder: `pdis-tickets/${id}/comment-temp`,
      filename: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
      resource_type: file.type.startsWith("image/") ? "image" : "raw",
    })

    // Save attachment record (without commentId - will be added when comment is created)
    const attachment = await prisma.ticketAttachment.create({
      data: {
        ticketId: id,
        fileName: file.name,
        fileUrl: result.secure_url,
        fileSize: result.bytes,
        fileType: file.type,
        uploadedById: session.user.id,
        // commentId will be set later when comment is created
      },
      include: {
        uploadedBy: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: attachment.id,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize,
      fileType: attachment.fileType,
      createdAt: attachment.createdAt.toISOString(),
      uploadedBy: attachment.uploadedBy,
    })
  } catch (error) {
    console.error("Error uploading comment attachment:", error)
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 500 }
    )
  }
}
