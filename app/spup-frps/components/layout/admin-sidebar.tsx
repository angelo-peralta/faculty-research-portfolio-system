"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  LayoutDashboard, Users, BookOpen, Briefcase, FileText,
  Settings, BarChart3, Building2, Shield, ChevronLeft,
  ChevronRight, ChevronDown, LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"
import { usePwa } from "@/components/pwa/pwa-provider"
import { getSignedOutEntryPath } from "@/lib/pwa/navigation"
import { DEPARTMENTS } from "@/lib/constants"

type AdminNavChild = {
  href: string
  label: string
}

type AdminNavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  mainAdminOnly?: boolean
  matchPrefix?: boolean
  children?: AdminNavChild[]
}

const departmentNavItems: AdminNavChild[] = DEPARTMENTS.map((department) => ({
  href: `/admin/departments/${department.value}`,
  label: department.value,
}))

const analyticsNavItems: AdminNavChild[] = [
  { href: "/admin/analytics", label: "Portfolio" },
  { href: "/admin/decision-support", label: "Compliance" },
]

const navItems: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/faculty", label: "Faculty List", icon: Users },
  { href: "/admin/publications", label: "Publications", icon: BookOpen },
  { href: "/admin/engagements", label: "Engagements", icon: Briefcase },
  { href: "/admin/research", label: "Research", icon: FileText },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: BarChart3,
    children: analyticsNavItems,
  },
  {
    href: "/admin/departments",
    label: "Departments",
    icon: Building2,
    matchPrefix: true,
    children: departmentNavItems,
  },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut, isMainAdmin } = useAuth()
  const { hasResolvedDisplayMode, isInstalled } = usePwa()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "/admin/analytics": false,
    "/admin/departments": false,
  })
  const visibleNavItems = navItems.filter((item) => !item.mainAdminOnly || isMainAdmin)

  const isItemActive = (item: AdminNavItem) => {
    const matchesSelf = item.matchPrefix
      ? pathname === item.href || pathname.startsWith(`${item.href}/`)
      : pathname === item.href

    const matchesChild = item.children?.some((child) => pathname === child.href) ?? false

    return matchesSelf || matchesChild
  }

  const toggleGroup = (href: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [href]: !current[href],
    }))
  }

  const handleSignOut = async () => {
    await signOut()
    router.replace(
      getSignedOutEntryPath({
        hasResolvedDisplayMode,
        isInstalled,
      })
    )
  }

  return (
    <aside 
      className={cn(
        "hidden lg:flex flex-col h-screen border-r border-admin-shell-border bg-admin-shell-chrome text-admin-shell-foreground shadow-[var(--admin-shell-side-shadow)] transition-all duration-300",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-admin-shell-border px-4">
        {!isCollapsed && (
          <div className="motion-fade-in flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-semibold text-sm">Admin Panel</span>
              <p className="text-[10px] text-admin-shell-muted">Faculty Research</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 text-admin-shell-foreground/70 hover:bg-admin-shell-accent hover:text-admin-shell-accent-foreground",
            isCollapsed && "hidden"
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = isItemActive(item)
          const showChildren =
            !isCollapsed &&
            Boolean(item.children?.length) &&
            (isActive || expandedGroups[item.href])

          return (
            <div key={item.href} className="space-y-1">
              <div className="flex items-center gap-1">
                <Link href={item.href} className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:translate-x-0.5",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-admin-shell-foreground/72 hover:bg-admin-shell-accent hover:text-admin-shell-accent-foreground",
                      isCollapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                </Link>
                {!isCollapsed && item.children?.length ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 shrink-0 rounded-lg text-admin-shell-foreground/60 hover:bg-admin-shell-accent hover:text-admin-shell-accent-foreground",
                      isActive && "text-primary"
                    )}
                    onClick={() => toggleGroup(item.href)}
                    aria-label={`${showChildren ? "Hide" : "Show"} ${item.label} links`}
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showChildren && "rotate-180")} />
                  </Button>
                ) : null}
              </div>

              {showChildren ? (
                <div className="ml-6 space-y-1 border-l border-admin-shell-border/80 pl-4">
                  {item.children?.map((child) => {
                    const isChildActive = pathname === child.href

                    return (
                      <Link key={child.href} href={child.href}>
                        <div
                          className={cn(
                            "rounded-md px-2.5 py-2 text-xs transition-colors",
                            isChildActive
                              ? "bg-admin-shell-accent text-admin-shell-accent-foreground"
                              : "text-admin-shell-muted hover:bg-admin-shell-accent/70 hover:text-admin-shell-foreground"
                          )}
                        >
                          <span className="font-semibold tracking-[0.18em] text-[11px] uppercase">
                            {child.label}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-admin-shell-border p-3">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 p-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.avatar_url || undefined} />
              <AvatarFallback className="bg-admin-shell-accent text-sm text-admin-shell-accent-foreground">
                {user?.name?.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="truncate text-xs text-admin-shell-muted">Administrator</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-admin-shell-foreground/70 hover:bg-admin-shell-accent hover:text-admin-shell-accent-foreground"
              onClick={() => void handleSignOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-admin-shell-foreground/70 hover:bg-admin-shell-accent hover:text-admin-shell-accent-foreground"
              onClick={() => setIsCollapsed(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  )
}
