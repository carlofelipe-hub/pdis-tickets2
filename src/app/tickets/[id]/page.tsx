"use client"

import { useEffect, useState, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  ArrowLeft,
  Loader2,
  Send,
  Bug,
  Lightbulb,
  TicketIcon,
  Clock,
  User,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  AlertCircle,
  XCircle
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"

interface Ticket {
  id: string
  ticketNumber: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  stepsToReproduce: string | null
  contactEmail: string
  contactPhone: string | null
  cancellationReason: string | null
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  cancelledAt: string | null
  deployedAt: string | null
  submitter: {
    id: string
    name: string | null
    firstName: string | null
    lastName: string | null
    email: string
    image: string | null
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
  comments: Array<{
    id: string
    content: string
    isInternal: boolean
    createdAt: string
    user: {
      id: string
      name: string | null
      firstName: string | null
      lastName: string | null
      image: string | null
    }
  }>
  statusHistory: Array<{
    id: string
    fromStatus: string | null
    toStatus: string
    reason: string | null
    createdAt: string
    changedBy: {
      name: string | null
      firstName: string | null
      lastName: string | null
    }
  }>
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
  BUG: <Bug className="h-5 w-5 text-red-500" />,
  FEATURE_REQUEST: <Lightbulb className="h-5 w-5 text-yellow-500" />,
  OTHER: <TicketIcon className="h-5 w-5 text-muted-foreground" />,
}

const formatStatus = (status: string) => {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
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

const getUserInitials = (user: { name: string | null; firstName: string | null; lastName: string | null }) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`
  }
  if (user.name) {
    const names = user.name.split(" ")
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0][0]
  }
  return "U"
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [comment, setComment] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await fetch(`/api/tickets/${id}`)
        if (response.ok) {
          const data = await response.json()
          setTicket(data)
        } else if (response.status === 404) {
          router.push("/tickets")
        }
      } catch (error) {
        console.error("Failed to fetch ticket:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTicket()
  }, [id, router])

  const handleSubmitComment = async () => {
    if (!comment.trim()) return

    setIsSubmittingComment(true)
    try {
      const response = await fetch(`/api/tickets/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      })

      if (response.ok) {
        const newComment = await response.json()
        setTicket((prev) => prev ? {
          ...prev,
          comments: [...prev.comments, newComment],
        } : null)
        setComment("")
        toast.success("Comment added")
      } else {
        throw new Error("Failed to add comment")
      }
    } catch {
      toast.error("Failed to add comment")
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleCancelTicket = async () => {
    if (!confirm("Are you sure you want to cancel this ticket?")) return

    setIsCancelling(true)
    try {
      const response = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      })

      if (response.ok) {
        const updatedTicket = await response.json()
        setTicket(updatedTicket)
        toast.success("Ticket cancelled")
      } else {
        throw new Error("Failed to cancel ticket")
      }
    } catch {
      toast.error("Failed to cancel ticket")
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground mb-4">Ticket not found</p>
        <Link href="/tickets">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            Back to Tickets
          </Button>
        </Link>
      </div>
    )
  }

  const isOwner = session?.user?.id === ticket.submitter.id
  const canCancel = isOwner && ticket.status === "FOR_PD_APPROVAL"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/tickets">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground font-mono">{ticket.ticketNumber}</span>
            <Badge variant="outline" className={statusColors[ticket.status]}>
              {formatStatus(ticket.status)}
            </Badge>
            <Badge variant="outline" className={priorityColors[ticket.priority]}>
              {ticket.priority.toLowerCase()}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">{ticket.title}</h1>
        </div>
        {canCancel && (
          <Button
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            onClick={handleCancelTicket}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Cancel Ticket
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                {categoryIcons[ticket.category]}
                <div>
                  <CardTitle className="text-foreground">{formatCategory(ticket.category)}</CardTitle>
                  <CardDescription className="text-muted-foreground">Description</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/80 whitespace-pre-wrap">{ticket.description}</p>

              {ticket.stepsToReproduce && (
                <>
                  <Separator className="my-4 bg-border" />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Steps to Reproduce</h4>
                    <p className="text-foreground/80 whitespace-pre-wrap">{ticket.stepsToReproduce}</p>
                  </div>
                </>
              )}

              {ticket.cancellationReason && (
                <>
                  <Separator className="my-4 bg-border" />
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <h4 className="text-sm font-medium text-red-500 mb-1">Cancellation Reason</h4>
                    <p className="text-foreground/80">{ticket.cancellationReason}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({ticket.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comment List */}
              {ticket.comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No comments yet</p>
              ) : (
                <div className="space-y-4">
                  {ticket.comments
                    .filter(c => !c.isInternal)
                    .map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.user.image || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {getUserInitials(comment.user)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {getUserDisplayName(comment.user)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment */}
              <Separator className="bg-border" />
              <div className="space-y-3">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground resize-none"
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!comment.trim() || isSubmittingComment}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isSubmittingComment ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Submitted by</p>
                  <p className="text-sm text-foreground">{getUserDisplayName(ticket.submitter)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Contact Email</p>
                  <p className="text-sm text-foreground">{ticket.contactEmail}</p>
                </div>
              </div>

              {ticket.contactPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Phone</p>
                    <p className="text-sm text-foreground">{ticket.contactPhone}</p>
                  </div>
                </div>
              )}

              <Separator className="bg-border" />

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm text-foreground">
                    {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm text-foreground">
                    {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {ticket.processOwner && (
                <>
                  <Separator className="bg-border" />
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Process Owner</p>
                      <p className="text-sm text-foreground">{getUserDisplayName(ticket.processOwner)}</p>
                    </div>
                  </div>
                </>
              )}

              {ticket.assignedDeveloper && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned Developer</p>
                    <p className="text-sm text-foreground">{getUserDisplayName(ticket.assignedDeveloper)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status History */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground text-base">Status History</CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.statusHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm">No status changes yet</p>
              ) : (
                <div className="space-y-3">
                  {ticket.statusHistory.map((history) => (
                    <div key={history.id} className="relative pl-4 pb-3 border-l border-border last:pb-0">
                      <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-muted border-2 border-card" />
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(history.createdAt), { addSuffix: true })}
                      </p>
                      <p className="text-sm text-foreground">
                        {history.fromStatus ? (
                          <>
                            <span className="text-muted-foreground">{formatStatus(history.fromStatus)}</span>
                            {" → "}
                          </>
                        ) : null}
                        <span className="text-orange-500">{formatStatus(history.toStatus)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by {getUserDisplayName(history.changedBy)}
                      </p>
                      {history.reason && (
                        <p className="text-xs text-muted-foreground/80 mt-1 italic">{history.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

