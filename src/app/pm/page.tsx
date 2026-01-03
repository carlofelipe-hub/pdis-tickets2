"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { 
  Eye, 
  Loader2,
  TicketIcon,
  Bug,
  Lightbulb,
  Wrench,
  HelpCircle,
  CheckCircle2,
  UserPlus,
  Play,
  Users
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface PMTicket {
  id: string
  ticketNumber: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  contactEmail: string
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  submitter: {
    id: string
    name: string | null
    firstName: string | null
    lastName: string | null
    email: string
    department: string | null
    office: string | null
  }
  processOwner: {
    id: string
    name: string | null
    firstName: string | null
    lastName: string | null
  } | null
  assignedDeveloper: {
    id: string
    name: string | null
    firstName: string | null
    lastName: string | null
  } | null
  assignedQa: {
    id: string
    name: string | null
    firstName: string | null
    lastName: string | null
  } | null
}

interface TeamUser {
  id: string
  name: string
  email: string
  position: string | null
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
  LOW: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20",
  MEDIUM: "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20",
  HIGH: "bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/20",
  URGENT: "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20",
}

const categoryIcons: Record<string, React.ReactNode> = {
  BUG: <Bug className="h-4 w-4 text-red-500" />,
  FEATURE_REQUEST: <Lightbulb className="h-4 w-4 text-yellow-500" />,
  ENHANCEMENT: <Wrench className="h-4 w-4 text-blue-500" />,
  SUPPORT: <HelpCircle className="h-4 w-4 text-green-500" />,
  TASK: <CheckCircle2 className="h-4 w-4 text-purple-500" />,
  OTHER: <TicketIcon className="h-4 w-4 text-muted-foreground" />,
}

const formatStatus = (status: string) => {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

const formatCategory = (category: string) => {
  return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

const getUserDisplayName = (user: { name: string | null; firstName: string | null; lastName: string | null } | null) => {
  if (!user) return "Unassigned"
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  return user.name || "Unknown User"
}

export default function PMPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tickets, setTickets] = useState<PMTicket[]>([])
  const [developers, setDevelopers] = useState<TeamUser[]>([])
  const [qaUsers, setQaUsers] = useState<TeamUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<PMTicket | null>(null)
  const [selectedDeveloper, setSelectedDeveloper] = useState<string>("")
  const [selectedQa, setSelectedQa] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("submitted")

  const isProjectManager = session?.user?.ticketRole === "PROJECT_MANAGER"

  useEffect(() => {
    if (status === "loading") return
    
    if (!isProjectManager) {
      router.push("/dashboard")
      return
    }

    const fetchData = async () => {
      try {
        const [ticketsRes, usersRes] = await Promise.all([
          fetch("/api/pm/tickets?status=all"),
          fetch("/api/pm/users"),
        ])

        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json()
          setTickets(ticketsData.tickets)
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setDevelopers(usersData.developers)
          setQaUsers(usersData.qaUsers)
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [status, isProjectManager, router])

  const handleAssign = async (startDevelopment: boolean = false) => {
    if (!selectedTicket) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/pm/tickets/${selectedTicket.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          developerId: selectedDeveloper || undefined,
          qaId: selectedQa || undefined,
          startDevelopment,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update ticket in list
        setTickets((prev) => prev.map((t) => {
          if (t.id === selectedTicket.id) {
            return {
              ...t,
              status: result.ticket.status,
              assignedDeveloper: result.ticket.assignedDeveloper,
              assignedQa: result.ticket.assignedQa,
            }
          }
          return t
        }))

        toast.success(
          startDevelopment 
            ? "Ticket assigned and development started" 
            : "Ticket assignments updated"
        )
        setSelectedTicket(null)
        setSelectedDeveloper("")
        setSelectedQa("")
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to assign ticket")
      }
    } catch (error) {
      toast.error("Failed to assign ticket", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openAssignDialog = (ticket: PMTicket) => {
    setSelectedTicket(ticket)
    setSelectedDeveloper(ticket.assignedDeveloper?.id || "")
    setSelectedQa(ticket.assignedQa?.id || "")
  }

  const filteredTickets = tickets.filter((t) => {
    if (activeTab === "submitted") return t.status === "SUBMITTED"
    if (activeTab === "in-progress") return t.status === "DEV_IN_PROGRESS"
    if (activeTab === "testing") return ["QA_TESTING", "PD_TESTING"].includes(t.status)
    if (activeTab === "deployment") return ["FOR_DEPLOYMENT", "DEPLOYED"].includes(t.status)
    return true
  })

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!isProjectManager) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Project Management</h1>
        <p className="text-muted-foreground mt-1">
          Assign developers and QA to tickets, manage workflow
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Assignment</p>
                <p className="text-2xl font-bold text-foreground">
                  {tickets.filter(t => t.status === "SUBMITTED").length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Development</p>
                <p className="text-2xl font-bold text-foreground">
                  {tickets.filter(t => t.status === "DEV_IN_PROGRESS").length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Play className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Testing</p>
                <p className="text-2xl font-bold text-foreground">
                  {tickets.filter(t => ["QA_TESTING", "PD_TESTING"].includes(t.status)).length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-cyan-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold text-foreground">
                  {developers.length + qaUsers.length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Tickets</CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage ticket assignments and workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="submitted">
                Awaiting Assignment ({tickets.filter(t => t.status === "SUBMITTED").length})
              </TabsTrigger>
              <TabsTrigger value="in-progress">
                In Progress ({tickets.filter(t => t.status === "DEV_IN_PROGRESS").length})
              </TabsTrigger>
              <TabsTrigger value="testing">
                Testing ({tickets.filter(t => ["QA_TESTING", "PD_TESTING"].includes(t.status)).length})
              </TabsTrigger>
              <TabsTrigger value="deployment">
                Deployment ({tickets.filter(t => ["FOR_DEPLOYMENT", "DEPLOYED"].includes(t.status)).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {filteredTickets.length === 0 ? (
                <div className="text-center py-12">
                  <TicketIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No tickets in this category</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Ticket</TableHead>
                        {activeTab === "submitted" ? (
                          <>
                            <TableHead className="text-muted-foreground">Description</TableHead>
                          </>
                        ) : (
                          <>
                          </>
                        )}
                        <TableHead className="text-muted-foreground">Category</TableHead>
                        <TableHead className="text-muted-foreground">Priority</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        {activeTab === "submitted" ? (
                          <></>
                        ) : (
                          <>
                            <TableHead className="text-muted-foreground">Developer</TableHead>
                            <TableHead className="text-muted-foreground">QA</TableHead>
                          </>
                        )}
                        <TableHead className="text-muted-foreground">Submitted</TableHead>
                        <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id} className="border-border hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <span className="text-xs text-muted-foreground font-mono block">
                                {ticket.ticketNumber}
                              </span>
                              <span className="text-foreground font-medium">
                                {ticket.title}
                              </span>
                              <span className="text-xs text-muted-foreground block">
                                by {getUserDisplayName(ticket.submitter)}
                              </span>
                            </div>
                          </TableCell>
                          {activeTab === "submitted" ? (
                            <TableCell className="max-w-xs">
                              <span className="text-foreground/80 text-sm block overflow-hidden text-ellipsis whitespace-nowrap">
                                {ticket.description}
                              </span>
                            </TableCell>
                          ) : (
                            <></>
                          )}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {categoryIcons[ticket.category]}
                              <span className="text-foreground/80 text-sm">
                                {formatCategory(ticket.category)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={priorityColors[ticket.priority]}>
                              {ticket.priority.toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[ticket.status]}>
                              {formatStatus(ticket.status)}
                            </Badge>
                          </TableCell>
                          {activeTab === "submitted" ? (
                            <></>
                          ) : (
                            <>
                              <TableCell>
                                <span className={ticket.assignedDeveloper ? "text-foreground text-sm" : "text-muted-foreground text-sm italic"}>
                                  {getUserDisplayName(ticket.assignedDeveloper)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={ticket.assignedQa ? "text-foreground text-sm" : "text-muted-foreground text-sm italic"}>
                                  {getUserDisplayName(ticket.assignedQa)}
                                </span>
                              </TableCell>
                            </>
                          )}

                          <TableCell className="text-muted-foreground text-sm">
                            {ticket.submittedAt 
                              ? formatDistanceToNow(new Date(ticket.submittedAt), { addSuffix: true })
                              : formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/tickets/${ticket.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                                onClick={() => openAssignDialog(ticket)}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog 
        open={!!selectedTicket} 
        onOpenChange={() => {
          setSelectedTicket(null)
          setSelectedDeveloper("")
          setSelectedQa("")
        }}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-500" />
              Assign Team Members
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Assign a developer and QA tester to this ticket
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="py-4 space-y-4">
              {/* Ticket Info */}
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground font-mono">
                  {selectedTicket.ticketNumber}
                </span>
                <p className="text-foreground font-medium">{selectedTicket.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={priorityColors[selectedTicket.priority]}>
                    {selectedTicket.priority.toLowerCase()}
                  </Badge>
                  <Badge variant="outline" className={statusColors[selectedTicket.status]}>
                    {formatStatus(selectedTicket.status)}
                  </Badge>
                </div>
              </div>

              {/* Developer Select */}
              <div className="space-y-2">
                <label className="text-sm text-foreground/80">
                  Assign Developer
                </label>
                <Select value={selectedDeveloper || "unassigned"} onValueChange={(value) => setSelectedDeveloper(value === "unassigned" ? "" : value)}>
                  <SelectTrigger className="bg-muted/50 border-border text-foreground">
                    <SelectValue placeholder="Select a developer..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {developers.map((dev) => (
                      <SelectItem key={dev.id} value={dev.id}>
                        {dev.name} {dev.position && `(${dev.position})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {developers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No developers available. Users need DEVELOPER role to appear here.
                  </p>
                )}
              </div>

              {/* QA Select */}
              <div className="space-y-2">
                <label className="text-sm text-foreground/80">
                  Assign QA Tester
                </label>
                <Select value={selectedQa || "unassigned"} onValueChange={(value) => setSelectedQa(value === "unassigned" ? "" : value)}>
                  <SelectTrigger className="bg-muted/50 border-border text-foreground">
                    <SelectValue placeholder="Select a QA tester..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {qaUsers.map((qa) => (
                      <SelectItem key={qa.id} value={qa.id}>
                        {qa.name} {qa.position && `(${qa.position})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {qaUsers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No QA testers available. Users need QA role to appear here.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedTicket(null)
                setSelectedDeveloper("")
                setSelectedQa("")
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAssign(false)}
              disabled={isSubmitting}
              className="border-border"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Save Assignments
            </Button>
            {selectedTicket?.status === "SUBMITTED" && (
              <Button
                onClick={() => handleAssign(true)}
                disabled={isSubmitting || !selectedDeveloper}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Assign & Start Dev
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
