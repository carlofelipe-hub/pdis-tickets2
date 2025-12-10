"use client"

import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, LogOut, Mail, User } from "lucide-react"

export default function IncompleteProfilePage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 mb-4 shadow-lg shadow-orange-500/20">
            <span className="text-2xl font-bold text-white">PD</span>
          </div>
          <h1 className="text-2xl font-bold text-white">PDIS Tickets</h1>
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <CardTitle className="text-xl text-white">Profile Setup Required</CardTitle>
            <CardDescription className="text-slate-400">
              Your account needs to be set up by People Management before you can access the ticketing system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {session?.user && (
              <div className="p-4 rounded-lg bg-slate-700/50 space-y-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <User className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">{session.user.name || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">{session.user.email}</span>
                </div>
              </div>
            )}

            <div className="space-y-2 text-sm text-slate-400">
              <p>To complete your account setup:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Contact the People Management department</li>
                <li>Provide them with your email address</li>
                <li>Wait for them to complete your profile setup</li>
                <li>Once done, sign out and sign in again</li>
              </ol>
            </div>

            <Button
              onClick={() => signOut({ callbackUrl: "/login" })}
              variant="outline"
              className="w-full bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-sm mt-6">
          Need help?{" "}
          <a href="mailto:hr@projectduo.com" className="text-orange-500 hover:text-orange-400">
            Contact People Management
          </a>
        </p>
      </div>
    </div>
  )
}

