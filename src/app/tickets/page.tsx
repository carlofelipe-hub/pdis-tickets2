"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { 
  Plus, 
  Search, 
  Filter,
  TicketIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Bug,
  Lightbulb,
  Wrench,
  HelpCircle,
  CheckCircle2
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Ticket {
  id: string
  ticketNumber: string
  title: string
  status: string
  priority: string
  category: string
  createdAt: string
  updatedAt: string
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
  BUG: <Bug className="h-4 w-4 text-red-400" />,
  FEATURE_REQUEST: <Lightbulb className="h-4 w-4 text-yellow-400" />,
  ENHANCEMENT: <Wrench className="h-4 w-4 text-blue-400" />,
  SUPPORT: <HelpCircle className="h-4 w-4 text-green-400" />,
  TASK: <CheckCircle2 className="h-4 w-4 text-purple-400" />,
  OTHER: <TicketIcon className="h-4 w-4 text-slate-400" />,
}

const formatStatus = (status: string) => {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

const formatCategory = (category: string) => {
  return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const fetchTickets = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
        })

        if (searchQuery) params.append("search", searchQuery)
        if (statusFilter !== "all") params.append("status", statusFilter)
        if (priorityFilter !== "all") params.append("priority", priorityFilter)
        if (categoryFilter !== "all") params.append("category", categoryFilter)

        const response = await fetch(`/api/tickets?${params}`)
        if (response.ok) {
          const data = await response.json()
          setTickets(data.tickets)
          setTotalPages(data.totalPages)
          setTotalCount(data.totalCount)
        }
      } catch (error) {
        console.error("Failed to fetch tickets:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTickets()
  }, [page, searchQuery, statusFilter, priorityFilter, categoryFilter])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter, priorityFilter, categoryFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Tickets</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all your submitted tickets
          </p>
        </div>
        <Link href="/tickets/new">
          <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px] bg-muted/50 border-border text-foreground">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="FOR_PD_APPROVAL">For Approval</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="DEV_IN_PROGRESS">In Development</SelectItem>
                <SelectItem value="QA_TESTING">QA Testing</SelectItem>
                <SelectItem value="PD_TESTING">PD Testing</SelectItem>
                <SelectItem value="FOR_DEPLOYMENT">For Deployment</SelectItem>
                <SelectItem value="DEPLOYED">Deployed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full lg:w-[180px] bg-muted/50 border-border text-foreground">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full lg:w-[180px] bg-muted/50 border-border text-foreground">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="BUG">Bug</SelectItem>
                <SelectItem value="FEATURE_REQUEST">Feature Request</SelectItem>
                <SelectItem value="ENHANCEMENT">Enhancement</SelectItem>
                <SelectItem value="SUPPORT">Support</SelectItem>
                <SelectItem value="TASK">Task</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">
            {totalCount} {totalCount === 1 ? "Ticket" : "Tickets"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Click on a ticket to view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <TicketIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No tickets found</p>
              <Link href="/tickets/new">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  Create your first ticket
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Ticket</TableHead>
                      <TableHead className="text-muted-foreground">Category</TableHead>
                      <TableHead className="text-muted-foreground">Priority</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow 
                        key={ticket.id} 
                        className="border-border hover:bg-muted/50 cursor-pointer"
                        onClick={() => window.location.href = `/tickets/${ticket.id}`}
                      >
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
                          <Badge variant="outline" className={statusColors[ticket.status]}>
                            {formatStatus(ticket.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="bg-muted/50 border-border text-foreground hover:bg-muted"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="bg-muted/50 border-border text-foreground hover:bg-muted"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

