import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { TicketRole } from "@/types/next-auth"
import { isTicketApprover, canCreateTickets } from "./access-control"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "openid",
            "email",
            "profile"
          ].join(" "),
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        }
      },
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.provider = account?.provider || "credentials"
      }

      // Always refresh user data from database
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string }
        })

        if (dbUser) {
          token.profileCompleted = dbUser.profileCompleted
          token.firstName = dbUser.firstName
          token.lastName = dbUser.lastName
          token.position = dbUser.position
          token.office = dbUser.office
          token.department = dbUser.department
          token.group = dbUser.group
          token.isDepartmentHead = dbUser.isDepartmentHead
          token.isOfficeHead = dbUser.isOfficeHead
          token.isGroupDirector = dbUser.isGroupDirector
          token.ticketRole = ((dbUser as { ticketRole?: string }).ticketRole as TicketRole) || "NORMAL"
          token.isTicketApprover = isTicketApprover(dbUser.email)
          token.canCreateTickets = canCreateTickets(dbUser.email)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.profileCompleted = token.profileCompleted as boolean
        session.user.provider = token.provider as string
        session.user.firstName = token.firstName as string | null
        session.user.lastName = token.lastName as string | null
        session.user.position = token.position as string | null
        session.user.office = token.office as string | null
        session.user.department = token.department as string | null
        session.user.group = token.group as string | null
        session.user.isDepartmentHead = token.isDepartmentHead as boolean
        session.user.isOfficeHead = token.isOfficeHead as boolean
        session.user.isGroupDirector = token.isGroupDirector as boolean
        session.user.ticketRole = token.ticketRole as "NORMAL" | "DEVELOPER" | "QA" | "PROJECT_MANAGER"
        session.user.isTicketApprover = token.isTicketApprover as boolean
        session.user.canCreateTickets = token.canCreateTickets as boolean
      }
      return session
    },
    async signIn({ account, user }) {
      // Check if user is authorized
      if (user?.email) {
        try {
          const authorizedUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: user.email },
                { pdEmail: user.email }
              ]
            }
          })

          // If user doesn't exist, create them (will need HR to complete profile)
          if (!authorizedUser && account?.provider === "google") {
            await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || '',
                image: user.image,
                profileCompleted: false,
              }
            })
            // Allow login but they'll see limited functionality
            return true
          }

          // If user exists but profile is not completed by HR
          if (authorizedUser && !authorizedUser.profileCompleted) {
            // Allow login but they'll see a message to contact HR
            return true
          }
        } catch (error) {
          console.error('Error checking user authorization:', error)
          return false
        }
      }

      return true
    }
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === "development",
}

