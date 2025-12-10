import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/pm/users - Get developers and QA users for assignment dropdowns
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only PROJECT_MANAGERs can access this
    if (session.user.ticketRole !== "PROJECT_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get all developers
    const developers = await prisma.user.findMany({
      where: {
        ticketRole: "DEVELOPER",
        profileCompleted: true,
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        position: true,
      },
      orderBy: [
        { firstName: "asc" },
        { lastName: "asc" },
      ],
    })

    // Get all QA testers
    const qaUsers = await prisma.user.findMany({
      where: {
        ticketRole: "QA",
        profileCompleted: true,
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        position: true,
      },
      orderBy: [
        { firstName: "asc" },
        { lastName: "asc" },
      ],
    })

    return NextResponse.json({
      developers: developers.map((u) => ({
        id: u.id,
        name: u.firstName && u.lastName 
          ? `${u.firstName} ${u.lastName}` 
          : u.name || u.email,
        email: u.email,
        position: u.position,
      })),
      qaUsers: qaUsers.map((u) => ({
        id: u.id,
        name: u.firstName && u.lastName 
          ? `${u.firstName} ${u.lastName}` 
          : u.name || u.email,
        email: u.email,
        position: u.position,
      })),
    })
  } catch (error) {
    console.error("Error fetching PM users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}
