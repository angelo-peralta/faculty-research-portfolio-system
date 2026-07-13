'use client'

import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { NotificationItem } from '@/lib/types'

interface NotificationFeedProps {
  items: NotificationItem[]
  unreadCount: number
  isLoading?: boolean
  emptyTitle: string
  emptyDescription: string
  onMarkAllRead: () => void
  onMarkRead: (notificationId: string) => void
}

export function NotificationFeed({
  items,
  unreadCount,
  isLoading = false,
  emptyTitle,
  emptyDescription,
  onMarkAllRead,
  onMarkRead,
}: NotificationFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 rounded-xl border border-border/50 bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>

        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-xl border border-border/50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-24" />
              </div>

              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[88%]" />
                <Skeleton className="h-4 w-[72%]" />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-card px-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{emptyTitle}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {unreadCount} unread
          </Badge>
          <Badge variant="outline">
            {items.length} total
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={onMarkAllRead} disabled={unreadCount === 0}>
          Mark all as read
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((notification) => (
          <Card key={notification.id} className={notification.read_at ? 'border-border/50' : 'border-primary/25 bg-primary/5'}>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">{notification.title}</h3>
                    {!notification.read_at && <Badge>Unread</Badge>}
                  </div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {notification.kind.replaceAll('_', ' ')}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">{notification.message}</p>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {notification.actor_name && <span>By {notification.actor_name}</span>}
                  {notification.related_user_name && <span>For {notification.related_user_name}</span>}
                </div>
                {!notification.read_at && (
                  <Button variant="ghost" size="sm" onClick={() => onMarkRead(notification.id)}>
                    Mark as read
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
