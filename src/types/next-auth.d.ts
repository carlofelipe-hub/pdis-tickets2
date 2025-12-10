import "next-auth"
import "next-auth/jwt"

// TicketRole enum matching Prisma schema
export type TicketRole = "NORMAL" | "DEVELOPER" | "QA" | "PROJECT_MANAGER"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      profileCompleted: boolean
      provider: string
      firstName: string | null
      lastName: string | null
      position: string | null
      office: string | null
      department: string | null
      group: string | null
      isDepartmentHead: boolean
      isOfficeHead: boolean
      isGroupDirector: boolean
      ticketRole: TicketRole
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    profileCompleted: boolean
    provider: string
    firstName: string | null
    lastName: string | null
    position: string | null
    office: string | null
    department: string | null
    group: string | null
    isDepartmentHead: boolean
    isOfficeHead: boolean
    isGroupDirector: boolean
    ticketRole: TicketRole
  }
}

