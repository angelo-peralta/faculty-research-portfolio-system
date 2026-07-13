'use client'

import dynamic from 'next/dynamic'
import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLoadingState } from '@/components/admin/admin-loading-state'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { TopHeader } from '@/components/layout/top-header'
import { usePwa } from '@/components/pwa/pwa-provider'
import { useAuth } from '@/lib/auth-context'
import { getSignedOutEntryPath } from '@/lib/pwa/navigation'
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  FileText,
  LayoutDashboard,
  Settings,
  Target,
  Users,
} from 'lucide-react'

const adminNavItems = [
  { href: '/admin/dashboard', title: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/faculty', title: 'Faculty', icon: Users },
  { href: '/admin/publications', title: 'Publications', icon: BookOpen },
  { href: '/admin/engagements', title: 'Engagements', icon: Briefcase },
  { href: '/admin/research', title: 'Research', icon: FileText },
  { href: '/admin/analytics', title: 'Analytics', icon: BarChart3 },
  { href: '/admin/decision-support', title: 'Compliance Analytics', icon: Target },
  { href: '/admin/departments', title: 'Departments', icon: Building2 },
  { href: '/admin/settings', title: 'Settings', icon: Settings },
]

const AdminGlobalSearch = dynamic(
  () => import('@/components/layout/admin-global-search').then((mod) => mod.AdminGlobalSearch),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-full max-w-xl rounded-lg border border-admin-shell-border bg-admin-shell-content px-3" />
    ),
  }
)

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, activeRole, isLoading, isAdmin, isMainAdmin } = useAuth()
  const { hasResolvedDisplayMode, isInstalled } = usePwa()
  const router = useRouter()
  const mobileNavItems = adminNavItems

  useEffect(() => {
    if (!isLoading && !user && hasResolvedDisplayMode) {
      router.replace(
        getSignedOutEntryPath({
          hasResolvedDisplayMode,
          isInstalled,
        })
      )
    } else if (!isLoading && user && (!isAdmin || activeRole === 'faculty')) {
      router.replace('/faculty/profile')
    }
  }, [user, activeRole, hasResolvedDisplayMode, isInstalled, isLoading, isAdmin, router])

  if (isLoading) {
    return <AdminLoadingState fullscreen />
  }

  if (!user || !isAdmin || activeRole === 'faculty') {
    return null
  }

  return (
    <div className="flex h-screen bg-admin-shell-chrome">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col bg-admin-shell-chrome">
        <TopHeader
          leadingContent={<AdminGlobalSearch isMainAdmin={isMainAdmin} />}
          tone="inverse"
        />
        <main className="flex-1 overflow-auto bg-admin-shell-content">
          <div className="motion-fade-up min-h-full w-full p-4 lg:p-6">
            {children}
          </div>
        </main>
        <MobileNav items={mobileNavItems} />
      </div>
    </div>
  )
}
