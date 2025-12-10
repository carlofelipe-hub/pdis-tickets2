"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  TicketIcon, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Bug,
  Lightbulb,
  Wrench,
  HelpCircle
} from "lucide-react"

interface TicketStats {
  total: number
  forApproval: number
  inProgress: number
  completed: number
}

interface RecentTicket {
  id: string
  ticketNumber: string
  title: string
  status: string
  priority: string
  category: string
  createdAt: string
}

const statusColors: Record<string, string> = {
  FOR_PD_APPROVAL: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  SUBMITTED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  DEV_IN_PROGRESS: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  QA_TESTING: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  PD_TESTING: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  FOR_DEPLOYMENT: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  DEPLOYED: "bg-green-500/10 text-green-500 border-green-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
}

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  MEDIUM: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  URGENT: "bg-red-500/10 text-red-400 border-red-500/20",
}

const categoryIcons: Record<string, React.ReactNode> = {
  BUG: <Bug className="h-4 w-4" />,
  FEATURE_REQUEST: <Lightbulb className="h-4 w-4" />,
  ENHANCEMENT: <Wrench className="h-4 w-4" />,
  SUPPORT: <HelpCircle className="h-4 w-4" />,
  TASK: <CheckCircle2 className="h-4 w-4" />,
  OTHER: <TicketIcon className="h-4 w-4" />,
}

const formatStatus = (status: string) => {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<TicketStats | null>(null)
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/dashboard/stats")
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
          setRecentTickets(data.recentTickets)
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const getUserDisplayName = () => {
    if (session?.user?.firstName) {
      return session.user.firstName
    }
    if (session?.user?.name) {
      return session.user.name.split(" ")[0]
    }
    return "there"
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {getUserDisplayName()}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s an overview of your tickets and activity
          </p>
        </div>
        <Link href="/tickets/new">
          <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border bg-card">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-8 w-12 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border bg-card hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tickets</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats?.total || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TicketIcon className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Awaiting Approval</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats?.forApproval || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats?.inProgress || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats?.completed || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <Card className="lg:col-span-2 border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Recent Tickets</CardTitle>
              <CardDescription className="text-muted-foreground">
                Your latest submitted tickets
              </CardDescription>
            </div>
            <Link href="/tickets">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <div className="h-10 w-10 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentTickets.length > 0 ? (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        {categoryIcons[ticket.category] || <TicketIcon className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">
                            {ticket.ticketNumber}
                          </span>
                          <Badge variant="outline" className={priorityColors[ticket.priority]}>
                            {ticket.priority.toLowerCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground truncate mt-1">{ticket.title}</p>
                      </div>
                      <Badge variant="outline" className={statusColors[ticket.status]}>
                        {formatStatus(ticket.status)}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TicketIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No tickets yet</p>
                <Link href="/tickets/new">
                  <Button size="sm" className="mt-4 bg-orange-500 hover:bg-orange-600 text-white">
                    Create your first ticket
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription className="text-muted-foreground">
              Common actions and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/tickets/new?category=BUG">
              <Button variant="outline" className="w-full justify-start bg-muted/50 border-border text-foreground hover:bg-muted">
                <Bug className="mr-3 h-4 w-4 text-red-500" />
                Report a Bug
              </Button>
            </Link>
            <Link href="/tickets/new?category=FEATURE_REQUEST">
              <Button variant="outline" className="w-full justify-start bg-muted/50 border-border text-foreground hover:bg-muted">
                <Lightbulb className="mr-3 h-4 w-4 text-yellow-500" />
                Request a Feature
              </Button>
            </Link>
            <Link href="/tickets/new?category=ENHANCEMENT">
              <Button variant="outline" className="w-full justify-start bg-muted/50 border-border text-foreground hover:bg-muted">
                <Wrench className="mr-3 h-4 w-4 text-blue-500" />
                Suggest Enhancement
              </Button>
            </Link>
            <Link href="/tickets/new?category=SUPPORT">
              <Button variant="outline" className="w-full justify-start bg-muted/50 border-border text-foreground hover:bg-muted">
                <HelpCircle className="mr-3 h-4 w-4 text-green-500" />
                Get Support
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

