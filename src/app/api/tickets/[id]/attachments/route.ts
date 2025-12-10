import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary"

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

// GET /api/tickets/[id]/attachments - List attachments
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
        attachments: {
          include: {
            uploadedBy: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Check access
    const canView =
      ticket.submitterId === session.user.id ||
      ticket.processOwnerId === session.user.id ||
      ticket.assignedDeveloperId === session.user.id ||
      ticket.assignedQaId === session.user.id ||
      session.user.isDepartmentHead ||
      session.user.isOfficeHead ||
      session.user.isGroupDirector

    if (!canView) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      attachments: ticket.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        fileSize: a.fileSize,
        fileType: a.fileType,
        createdAt: a.createdAt.toISOString(),
        uploadedBy: a.uploadedBy,
      })),
    })
  } catch (error) {
    console.error("Error fetching attachments:", error)
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    )
  }
}

// POST /api/tickets/[id]/attachments - Upload attachment
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

    // Check if ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Check if user can upload
    const canUpload =
      ticket.submitterId === session.user.id ||
      ticket.processOwnerId === session.user.id ||
      ticket.assignedDeveloperId === session.user.id ||
      ticket.assignedQaId === session.user.id ||
      session.user.isDepartmentHead ||
      session.user.isOfficeHead ||
      session.user.isGroupDirector

    if (!canUpload) {
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

    // Upload to Cloudinary
    const result = await uploadToCloudinary(buffer, {
      folder: `pdis-tickets/${id}`,
      filename: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
      resource_type: file.type.startsWith("image/") ? "image" : "raw",
    })

    // Save attachment record
    const attachment = await prisma.ticketAttachment.create({
      data: {
        ticketId: id,
        fileName: file.name,
        fileUrl: result.secure_url,
        fileSize: result.bytes,
        fileType: file.type,
        uploadedById: session.user.id,
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
    console.error("Error uploading attachment:", error)
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 500 }
    )
  }
}

// DELETE /api/tickets/[id]/attachments - Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get("attachmentId")

    if (!attachmentId) {
      return NextResponse.json(
        { error: "Attachment ID required" },
        { status: 400 }
      )
    }

    const attachment = await prisma.ticketAttachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    })

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      )
    }

    if (attachment.ticketId !== id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    // Only uploader or admins can delete
    const canDelete =
      attachment.uploadedById === session.user.id ||
      session.user.isDepartmentHead ||
      session.user.isOfficeHead ||
      session.user.isGroupDirector

    if (!canDelete) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Extract public_id from URL for Cloudinary deletion
    const urlParts = attachment.fileUrl.split("/")
    const publicIdWithExtension = urlParts.slice(-2).join("/")
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, "")

    try {
      await deleteFromCloudinary(publicId)
    } catch (error) {
      console.error("Error deleting from Cloudinary:", error)
      // Continue to delete record even if Cloudinary fails
    }

    await prisma.ticketAttachment.delete({
      where: { id: attachmentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting attachment:", error)
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    )
  }
}

