"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Loader2,
  TicketIcon,
  Bug,
  Lightbulb,
  Wrench,
  HelpCircle,
  AlertTriangle
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface PendingTicket {
  id: string
  ticketNumber: string
  title: string
  description: string
  category: string
  priority: string
  contactEmail: string
  createdAt: string
  submitter: {
    name: string | null
    firstName: string | null
    lastName: string | null
    email: string
  }
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

const formatCategory = (category: string) => {
  return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

const getUserDisplayName = (user: { name: string | null; firstName: string | null; lastName: string | null }) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  return user.name || "Unknown User"
}

export default function ApprovalsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tickets, setTickets] = useState<PendingTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<PendingTicket | null>(null)
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isProcessOwner = session?.user?.isTicketApprover

  useEffect(() => {
    if (status === "loading") return
    
    if (!isProcessOwner) {
      router.push("/dashboard")
      return
    }

    const fetchPendingTickets = async () => {
      try {
        const response = await fetch("/api/approvals")
        if (response.ok) {
          const data = await response.json()
          setTickets(data.tickets)
        }
      } catch (error) {
        console.error("Failed to fetch pending tickets:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPendingTickets()
  }, [status, isProcessOwner, router])

  const handleApproval = async () => {
    if (!selectedTicket || !actionType) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/approvals/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          reason: reason || undefined,
        }),
      })

      if (response.ok) {
        toast.success(
          actionType === "approve" 
            ? "Ticket approved successfully" 
            : "Ticket rejected"
        )
        setTickets((prev) => prev.filter((t) => t.id !== selectedTicket.id))
        setSelectedTicket(null)
        setActionType(null)
        setReason("")
      } else {
        const error = await response.json()
        throw new Error(error.message || "Failed to process approval")
      }
    } catch (error) {
      toast.error("Failed to process approval", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!isProcessOwner) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pending Approvals</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve or reject ticket submissions
        </p>
      </div>

      {/* Pending Tickets */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">
            {tickets.length} Pending {tickets.length === 1 ? "Ticket" : "Tickets"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Tickets awaiting your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-muted-foreground">No pending tickets to review</p>
              <p className="text-muted-foreground/70 text-sm mt-1">
                All caught up! Check back later for new submissions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Ticket</TableHead>
                    <TableHead className="text-muted-foreground">Category</TableHead>
                    <TableHead className="text-muted-foreground">Priority</TableHead>
                    <TableHead className="text-muted-foreground">Submitted By</TableHead>
                    <TableHead className="text-muted-foreground">Submitted</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <span className="text-xs text-muted-foreground font-mono block">
                            {ticket.ticketNumber}
                          </span>
                          <span className="text-foreground font-medium">
                            {ticket.title}
                          </span>
                        </div>
                      </TableCell>
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
                        <div>
                          <span className="text-foreground text-sm block">
                            {getUserDisplayName(ticket.submitter)}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {ticket.submitter.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
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
                            className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                            onClick={() => {
                              setSelectedTicket(ticket)
                              setActionType("approve")
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => {
                              setSelectedTicket(ticket)
                              setActionType("reject")
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval/Rejection Dialog */}
      <Dialog 
        open={!!selectedTicket && !!actionType} 
        onOpenChange={() => {
          setSelectedTicket(null)
          setActionType(null)
          setReason("")
        }}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              {actionType === "approve" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Approve Ticket
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Reject Ticket
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {actionType === "approve"
                ? "This ticket will be submitted to the development team for review."
                : "This ticket will be cancelled and the submitter will be notified."}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="py-4">
              <div className="p-3 rounded-lg bg-muted/50 mb-4">
                <span className="text-xs text-muted-foreground font-mono">
                  {selectedTicket.ticketNumber}
                </span>
                <p className="text-foreground font-medium">{selectedTicket.title}</p>
                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                  {selectedTicket.description}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-foreground/80">
                  {actionType === "approve" ? "Comments (optional)" : "Rejection Reason"}
                  {actionType === "reject" && <span className="text-red-500"> *</span>}
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    actionType === "approve"
                      ? "Add any comments for the development team..."
                      : "Please provide a reason for rejection..."
                  }
                  className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedTicket(null)
                setActionType(null)
                setReason("")
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproval}
              disabled={isSubmitting || (actionType === "reject" && !reason.trim())}
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : actionType === "approve" ? (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {actionType === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

