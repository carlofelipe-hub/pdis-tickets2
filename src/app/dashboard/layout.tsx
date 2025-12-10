"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  LayoutDashboard, 
  TicketIcon, 
  Plus, 
  LogOut, 
  User,
  Menu,
  X,
  CheckCircle2,
  Briefcase
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ui/theme-toggle"

interface DashboardLayoutProps {
  children: ReactNode
}

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My Tickets",
    href: "/tickets",
    icon: TicketIcon,
  },
  {
    label: "New Ticket",
    href: "/tickets/new",
    icon: Plus,
  },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const getUserInitials = () => {
    if (session?.user?.firstName && session?.user?.lastName) {
      return `${session.user.firstName[0]}${session.user.lastName[0]}`
    }
    if (session?.user?.name) {
      const names = session.user.name.split(" ")
      return names.length > 1 
        ? `${names[0][0]}${names[names.length - 1][0]}`
        : names[0][0]
    }
    return "U"
  }

  const getUserDisplayName = () => {
    if (session?.user?.firstName && session?.user?.lastName) {
      return `${session.user.firstName} ${session.user.lastName}`
    }
    return session?.user?.name || "User"
  }

  // Check if user is a process owner (department head, office head, or group director)
  const isProcessOwner = session?.user?.isDepartmentHead || 
                          session?.user?.isOfficeHead || 
                          session?.user?.isGroupDirector

  // Check if user is a project manager
  const isProjectManager = session?.user?.ticketRole === "PROJECT_MANAGER"

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <span className="text-sm font-bold text-white">PD</span>
              </div>
              <span className="text-lg font-semibold text-foreground hidden sm:block">
                PDIS Tickets
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "text-muted-foreground hover:text-foreground hover:bg-accent",
                        isActive && "text-foreground bg-accent"
                      )}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
              {isProcessOwner && (
                <Link href="/approvals">
                  <Button
                    variant="ghost"
                    className={cn(
                      "text-muted-foreground hover:text-foreground hover:bg-accent",
                      pathname === "/approvals" && "text-foreground bg-accent"
                    )}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approvals
                  </Button>
                </Link>
              )}
              {isProjectManager && (
                <Link href="/pm">
                  <Button
                    variant="ghost"
                    className={cn(
                      "text-muted-foreground hover:text-foreground hover:bg-accent",
                      pathname === "/pm" && "text-foreground bg-accent"
                    )}
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Management
                  </Button>
                </Link>
              )}
            </nav>

            {/* User Menu & Theme Toggle */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={session?.user?.image || undefined} alt={getUserDisplayName()} />
                      <AvatarFallback className="bg-orange-500 text-white text-sm">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-card border-border" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-foreground">{getUserDisplayName()}</p>
                      <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                      {session?.user?.position && (
                        <p className="text-xs text-muted-foreground/70">{session.user.position}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem className="text-foreground hover:bg-accent cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem 
                    className="text-destructive hover:bg-accent cursor-pointer"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-muted-foreground"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <nav className="container mx-auto px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent",
                        isActive && "text-foreground bg-accent"
                      )}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
              {isProcessOwner && (
                <Link href="/approvals" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent",
                      pathname === "/approvals" && "text-foreground bg-accent"
                    )}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approvals
                  </Button>
                </Link>
              )}
              {isProjectManager && (
                <Link href="/pm" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent",
                      pathname === "/pm" && "text-foreground bg-accent"
                    )}
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Management
                  </Button>
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}

