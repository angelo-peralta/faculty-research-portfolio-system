'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  LogOut,
  Settings,
  ArrowLeftRight,
  Menu,
} from 'lucide-react'
import { usePwa } from '@/components/pwa/pwa-provider'
import { getSignedOutEntryPath } from '@/lib/pwa/navigation'
import {
  useAdminNotificationsQuery,
  useAdminNotificationsReadMutation,
  useFacultyNotificationsQuery,
  useFacultyNotificationsReadMutation,
} from '@/lib/query/notifications'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import type { NotificationItem, NotificationListResponse } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TopHeaderProps {
  title?: string
  subtitle?: string
  showMobileMenu?: boolean
  onMobileMenuClick?: () => void
  className?: string
  tone?: 'default' | 'inverse'
  leadingContent?: ReactNode
}

const NOTIFICATION_PREVIEW_LIMIT = 5
const NOTIFICATION_SOUND_PATH = '/notification_sound.mp3'
const EMPTY_NOTIFICATIONS: NotificationListResponse = {
  items: [],
  unread_count: 0,
}

export function TopHeader({
  title,
  subtitle,
  showMobileMenu = false,
  onMobileMenuClick,
  className,
  tone = 'default',
  leadingContent,
}: TopHeaderProps) {
  const router = useRouter()
  const { user, activeRole, signOut, switchRole, isFaculty, isAdmin } = useAuth()
  const userId = user?.id
  const { hasResolvedDisplayMode, isInstalled } = usePwa()
  const isFacultyWorkspaceActive = Boolean(user && activeRole === 'faculty')
  const isAdminWorkspaceActive = Boolean(user && activeRole && activeRole !== 'faculty')
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false)
  const facultyNotificationsQuery = useFacultyNotificationsQuery({
    limit: NOTIFICATION_PREVIEW_LIMIT,
    enabled: isFacultyWorkspaceActive && isNotificationMenuOpen,
  })
  const adminNotificationsQuery = useAdminNotificationsQuery({
    limit: NOTIFICATION_PREVIEW_LIMIT,
    enabled: isAdminWorkspaceActive && isNotificationMenuOpen,
  })
  const facultyReadMutation = useFacultyNotificationsReadMutation()
  const adminReadMutation = useAdminNotificationsReadMutation()
  const knownNotificationIdsRef = useRef<Set<string>>(new Set())
  const notificationScopeRef = useRef<string | null>(null)

  const handleSignOut = async () => {
    await signOut()
    router.replace(
      getSignedOutEntryPath({
        hasResolvedDisplayMode,
        isInstalled,
      })
    )
  }

  const handleSwitchRole = async () => {
    if (activeRole === 'faculty' && isAdmin) {
      const adminRole = user?.roles.find(r => r === 'main-admin' || r === 'secondary-admin')
      if (adminRole) {
        await switchRole(adminRole)
        router.replace('/admin/dashboard')
      }
    } else if (isFaculty) {
      await switchRole('faculty')
      router.replace('/faculty/profile')
    }
  }

  const canSwitchRole = isFaculty && isAdmin
  const targetRoleLabel = activeRole === 'faculty' ? 'Admin' : 'Faculty'
  const notificationsPath = activeRole === 'faculty' ? '/faculty/notifications' : '/admin/notifications'
  const activeNotificationsQuery =
    activeRole === 'faculty' ? facultyNotificationsQuery : adminNotificationsQuery
  const notifications: NotificationListResponse =
    user && activeRole ? (activeNotificationsQuery.data ?? EMPTY_NOTIFICATIONS) : EMPTY_NOTIFICATIONS
  const isNotificationsLoading =
    Boolean(user && activeRole && isNotificationMenuOpen) &&
    activeNotificationsQuery.isLoading

  useEffect(() => {
    if (!userId || !activeRole) {
      knownNotificationIdsRef.current = new Set()
      notificationScopeRef.current = null
      return
    }

    if (isNotificationsLoading) {
      return
    }

    const notificationScope = `${userId}:${activeRole}`
    const currentNotificationIds = new Set(notifications.items.map((notification) => notification.id))

    if (notificationScopeRef.current !== notificationScope) {
      knownNotificationIdsRef.current = currentNotificationIds
      notificationScopeRef.current = notificationScope
      return
    }

    const hasNewUnreadNotification = notifications.items.some(
      (notification) => !notification.read_at && !knownNotificationIdsRef.current.has(notification.id)
    )

    knownNotificationIdsRef.current = currentNotificationIds

    if (!hasNewUnreadNotification) {
      return
    }

    void new Audio(NOTIFICATION_SOUND_PATH).play().catch(() => undefined)
  }, [activeRole, isNotificationsLoading, notifications.items, userId])

  const unreadBadgeLabel = useMemo(() => {
    if (notifications.unread_count <= 0) {
      return null
    }

    return notifications.unread_count > 9 ? '9+' : String(notifications.unread_count)
  }, [notifications.unread_count])

  const markNotificationReadLocally = (notificationId: string) => {
    return notificationId
  }

  const handleNotificationOpen = async (notification: NotificationItem) => {
    if (!notification.read_at) {
      try {
        if (activeRole === 'faculty') {
          await facultyReadMutation.mutateAsync({ ids: [notification.id] })
        } else {
          await adminReadMutation.mutateAsync({ ids: [notification.id] })
        }

        markNotificationReadLocally(notification.id)
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }

    router.push(notification.href ?? notificationsPath)
  }

  const handleMarkAllRead = async () => {
    try {
      if (activeRole === 'faculty') {
        await facultyReadMutation.mutateAsync({ markAll: true })
      } else {
        await adminReadMutation.mutateAsync({ markAll: true })
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const getRoleBadgeVariant = () => {
    if (activeRole === 'main-admin') return 'default'
    if (activeRole === 'secondary-admin') return 'secondary'
    return 'outline'
  }

  const getRoleLabel = () => {
    if (activeRole === 'main-admin') return 'Main Admin'
    if (activeRole === 'secondary-admin') return 'Admin'
    return 'Faculty'
  }

  const isInverse = tone === 'inverse'

  const renderNotificationPreviewSkeleton = () => (
    <div className="space-y-2 p-2">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-lg border border-border/40 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-1 h-2 w-2 rounded-full" />
          </div>
          <div className="mt-2 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[82%]" />
          </div>
          <Skeleton className="mt-3 h-3 w-24" />
        </div>
      ))}
    </div>
  )

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center gap-4 px-6 backdrop-blur',
        isInverse
          ? 'border-b border-admin-shell-border bg-admin-shell-chrome text-admin-shell-foreground shadow-[var(--admin-shell-top-shadow)]'
          : 'border-b border-border/60 bg-card/95 shadow-[0_6px_16px_rgba(15,23,42,0.08)] supports-[backdrop-filter]:bg-card/88',
        className
      )}
    >
      {/* Mobile Menu Button */}
      {showMobileMenu && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'lg:hidden',
            isInverse &&
              'text-admin-shell-foreground/70 hover:bg-admin-shell-accent hover:text-admin-shell-accent-foreground'
          )}
          onClick={onMobileMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {leadingContent ? (
        <div className="min-w-0 flex-1">{leadingContent}</div>
      ) : title ? (
        <div className="min-w-0 flex-1">
          <h1 className={cn('text-lg font-semibold', isInverse ? 'text-admin-shell-foreground' : 'text-foreground')}>
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                'text-xs leading-snug sm:text-sm',
                isInverse ? 'text-admin-shell-muted' : 'text-muted-foreground'
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Role Badge */}
        <Badge
          variant={getRoleBadgeVariant()}
          className={cn(
            'hidden sm:flex',
            activeRole === 'main-admin' && 'gradient-primary border-0',
            isInverse &&
              activeRole !== 'main-admin' &&
              'border-admin-shell-border bg-admin-shell-content text-admin-shell-foreground'
          )}
        >
          {getRoleLabel()}
        </Badge>

        {/* Notifications */}
        <DropdownMenu open={isNotificationMenuOpen} onOpenChange={setIsNotificationMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'relative',
                isInverse &&
                  'text-admin-shell-foreground/72 hover:bg-admin-shell-accent hover:text-admin-shell-accent-foreground'
              )}
            >
              <Bell className="h-5 w-5" />
              {unreadBadgeLabel && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {unreadBadgeLabel}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Notifications</p>
              </div>
              {notifications.unread_count > 0 && (
                <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={() => void handleMarkAllRead()}>
                  Mark all read
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-96">
              {isNotificationsLoading ? (
                renderNotificationPreviewSkeleton()
              ) : (
                <div className="p-2">
                  {notifications.items.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.items.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void handleNotificationOpen(notification)}
                      className={cn(
                        'flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60',
                        !notification.read_at && 'bg-primary/5'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">{notification.title}</span>
                        {!notification.read_at && <span className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {notification.message}
                      </span>
                      <span className="mt-2 text-[11px] text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </button>
                  ))
                  )}
                </div>
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'relative h-10 w-10 rounded-full',
                isInverse && 'hover:bg-admin-shell-accent'
              )}
            >
              <Avatar
                className={cn('h-10 w-10 border-2', isInverse ? 'border-admin-shell-border' : 'border-border')}
              >
                <AvatarImage src={user?.avatar_url || undefined} alt={user?.name} />
                <AvatarFallback
                  className={cn(
                    'font-medium',
                    isInverse
                      ? 'bg-admin-shell-accent text-admin-shell-accent-foreground'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(activeRole === 'faculty' ? '/faculty/settings' : '/admin/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            {canSwitchRole && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSwitchRole}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  <span>
                    Switch Role to {targetRoleLabel}
                  </span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
