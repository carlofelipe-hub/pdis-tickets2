import { Prisma, TicketRole, TicketStatus } from "@prisma/client"

/**
 * Builds a Prisma where clause for tickets based on user role and assignment.
 * Users can see tickets they submitted OR tickets assigned to them based on their role.
 *
 * @param userId - The ID of the user
 * @param ticketRole - The user's role in the ticketing system
 * @returns A Prisma where clause that filters tickets appropriately
 */
export function buildUserTicketsWhereClause(
  userId: string,
  ticketRole: TicketRole
): Prisma.TicketWhereInput {
  // NORMAL users can only see tickets they submitted
  if (ticketRole === "NORMAL") {
    return {
      submitterId: userId,
    }
  }

  // DEVELOPERS can see:
  // 1. Tickets they submitted (any status)
  // 2. Tickets assigned to them as developer in dev/testing/deployment phases
  if (ticketRole === "DEVELOPER") {
    return {
      OR: [
        { submitterId: userId },
        {
          assignedDeveloperId: userId,
          status: {
            in: [
              "DEV_IN_PROGRESS",
              "QA_TESTING",
              "PD_TESTING",
              "FOR_DEPLOYMENT",
            ] as TicketStatus[],
          },
        },
      ],
    }
  }

  // QA can see:
  // 1. Tickets they submitted (any status)
  // 2. Tickets assigned to them as QA in testing/deployment phases
  if (ticketRole === "QA") {
    return {
      OR: [
        { submitterId: userId },
        {
          assignedQaId: userId,
          status: {
            in: [
              "QA_TESTING",
              "PD_TESTING",
              "FOR_DEPLOYMENT",
              "DEPLOYED",
            ] as TicketStatus[],
          },
        },
      ],
    }
  }

  // PROJECT_MANAGER can see:
  // 1. Tickets they submitted (any status)
  // 2. Tickets assigned to them as process owner (awaiting approval)
  if (ticketRole === "PROJECT_MANAGER") {
    return {
      OR: [
        { submitterId: userId },
        {
          processOwnerId: userId,
          status: "FOR_PD_APPROVAL" as TicketStatus,
        },
      ],
    }
  }

  // Default fallback: only show submitted tickets
  return {
    submitterId: userId,
  }
}

/**
 * Returns the status filters appropriate for a user's role when viewing assigned tickets.
 * This is useful for understanding which ticket statuses are relevant for each role.
 *
 * @param ticketRole - The user's role in the ticketing system
 * @returns Array of ticket statuses relevant to that role
 */
export function getRoleStatusFilter(ticketRole: TicketRole): TicketStatus[] {
  switch (ticketRole) {
    case "DEVELOPER":
      return ["DEV_IN_PROGRESS", "QA_TESTING", "PD_TESTING", "FOR_DEPLOYMENT"]
    case "QA":
      return ["QA_TESTING", "PD_TESTING", "FOR_DEPLOYMENT", "DEPLOYED"]
    case "PROJECT_MANAGER":
      return ["FOR_PD_APPROVAL"]
    case "NORMAL":
    default:
      return []
  }
}

/**
 * Checks if a user can view a specific ticket based on their role and the ticket's assignment.
 *
 * @param ticket - The ticket to check (with assignment fields)
 * @param userId - The ID of the user
 * @param ticketRole - The user's role in the ticketing system
 * @returns true if the user can view the ticket, false otherwise
 */
export function canUserViewTicket(
  ticket: {
    submitterId: string
    assignedDeveloperId?: string | null
    assignedQaId?: string | null
    processOwnerId?: string | null
    status: TicketStatus
  },
  userId: string,
  ticketRole: TicketRole
): boolean {
  // User submitted the ticket - always can view
  if (ticket.submitterId === userId) {
    return true
  }

  // Check role-based assignment
  if (ticketRole === "DEVELOPER" && ticket.assignedDeveloperId === userId) {
    const devStatuses = getRoleStatusFilter("DEVELOPER")
    return devStatuses.includes(ticket.status)
  }

  if (ticketRole === "QA" && ticket.assignedQaId === userId) {
    const qaStatuses = getRoleStatusFilter("QA")
    return qaStatuses.includes(ticket.status)
  }

  if (
    ticketRole === "PROJECT_MANAGER" &&
    ticket.processOwnerId === userId &&
    ticket.status === "FOR_PD_APPROVAL"
  ) {
    return true
  }

  return false
}
