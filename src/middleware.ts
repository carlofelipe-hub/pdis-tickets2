import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // If user is logged in but profile not completed, redirect to incomplete-profile page
    if (token && !token.profileCompleted && pathname !== "/incomplete-profile" && pathname !== "/login") {
      return NextResponse.redirect(new URL("/incomplete-profile", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // Public routes
        if (pathname === "/login" || pathname.startsWith("/api/auth")) {
          return true
        }

        // Protected routes require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}

