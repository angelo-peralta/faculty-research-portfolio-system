'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  GraduationCap,
  User,
  BookOpen,
  FileText,
  Users,
  FlaskConical,
  Settings,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react'

interface FacultySidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

interface FacultyNavItem {
  title: string
  href: string
  icon: LucideIcon
}

const navItems: FacultyNavItem[] = [
  {
    title: 'My Profile',
    href: '/faculty/profile',
    icon: User,
  },
  {
    title: 'Education',
    href: '/faculty/education',
    icon: GraduationCap,
  },
  {
    title: 'Publications',
    href: '/faculty/publications',
    icon: BookOpen,
  },
  {
    title: 'Engagements',
    href: '/faculty/engagements',
    icon: Users,
  },
  {
    title: 'Researches',
    href: '/faculty/research',
    icon: FlaskConical,
  },
]

const bottomItems: FacultyNavItem[] = [
  {
    title: 'Settings',
    href: '/faculty/settings',
    icon: Settings,
  },
]

export function FacultySidebar({ collapsed = false, onToggle }: FacultySidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-semibold text-sidebar-foreground truncate">
                Research Portfolio
              </h1>
              <p className="text-xs text-sidebar-foreground/60 truncate">Faculty Workspace</p>
            </div>
          )}
          {onToggle && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'ml-auto h-8 w-8 shrink-0',
                collapsed && 'absolute -right-3 top-6 bg-background border shadow-sm rounded-full'
              )}
              onClick={onToggle}
            >
              <ChevronLeft
                className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
              />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-3 h-11',
                      isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
                      !isActive && 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                      collapsed && 'justify-center px-0'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                    {!collapsed && <span>{item.title}</span>}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Bottom Items */}
        <div className="border-t border-sidebar-border p-3">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 h-11',
                    isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
                    !isActive && 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                  {!collapsed && <span>{item.title}</span>}
                </Button>
              </Link>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
