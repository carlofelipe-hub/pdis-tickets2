import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { validateApiKey } from "@/lib/api-auth"

// Validation schema for SAP ticket request
const sapTicketSchema = z.object({
  sapPayload: z.record(z.string(), z.unknown()),
  sapResponse: z.record(z.string(), z.unknown()),
  formData: z.record(z.string(), z.unknown()),
})

// Fixed submitter ID for SAP integration
const SAP_SUBMITTER_ID = "cmg07ttto0002pb0k2i3w9qcu"

// Generate ticket number (reused from main ticket API)
async function generateTicketNumber(): Promise<string> {
  const today = new Date()
  const year = today.getFullYear().toString().slice(-2)
  const month = (today.getMonth() + 1).toString().padStart(2, "0")
  const prefix = `TKT-${year}${month}`

  // Find the last ticket number for this month
  const lastTicket = await prisma.ticket.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      ticketNumber: "desc",
    },
    select: {
      ticketNumber: true,
    },
  })

  let sequence = 1
  if (lastTicket) {
    const lastSequence = parseInt(lastTicket.ticketNumber.split("-")[2], 10)
    sequence = lastSequence + 1
  }

  return `${prefix}-${sequence.toString().padStart(4, "0")}`
}

// Format JSON objects into readable description
function formatDescription(
  sapPayload: Record<string, any>,
  sapResponse: Record<string, any>,
  formData: Record<string, any>
): string {
  return `SAP Integration Error - Automatic ticket created by SAP system

SAP PAYLOAD:
${JSON.stringify(sapPayload, null, 2)}

SAP RESPONSE:
${JSON.stringify(sapResponse, null, 2)}

FORM DATA:
${JSON.stringify(formData, null, 2)}`
}

/**
 * POST /api/external/sap/tickets
 * Create a ticket from SAP integration that bypasses approval workflow
 *
 * Authentication: API Key via x-api-key header
 * Status: SUBMITTED (ready for assignment)
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid or missing API key" },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = sapTicketSchema.parse(body)

    // Verify submitter user exists
    const submitter = await prisma.user.findUnique({
      where: { id: SAP_SUBMITTER_ID },
      select: { id: true, email: true },
    })

    if (!submitter) {
      console.error(`SAP submitter user not found: ${SAP_SUBMITTER_ID}`)
      return NextResponse.json(
        { error: "Configuration error - Submitter user not found" },
        { status: 404 }
      )
    }

    // Generate ticket number
    const ticketNumber = await generateTicketNumber()

    // Format description with all JSON payloads
    const description = formatDescription(
      validatedData.sapPayload,
      validatedData.sapResponse,
      validatedData.formData
    )

    // Create ticket with SUBMITTED status (bypasses approval)
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: "SAP Integration Fail",
        description,
        category: "BUG",
        priority: "URGENT",
        status: "SUBMITTED", // Bypass FOR_PD_APPROVAL
        submitterId: SAP_SUBMITTER_ID,
        contactEmail: submitter.email || "sap-integration@projectduo.ph",
        processOwnerId: null, // No approval needed
        submittedAt: new Date(), // Auto-submitted
      },
    })

    // Create status history entry
    await prisma.ticketStatusHistory.create({
      data: {
        ticketId: ticket.id,
        fromStatus: null,
        toStatus: "SUBMITTED",
        changedById: SAP_SUBMITTER_ID,
        reason: "Auto-created by SAP integration",
      },
    })

    // Log successful creation
    console.log(`SAP ticket created: ${ticket.ticketNumber} (ID: ${ticket.id})`)

    return NextResponse.json({
      success: true,
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.id,
    })
  } catch (error) {
    console.error("Error creating SAP ticket:", error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    // Generic error
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    )
  }
}
