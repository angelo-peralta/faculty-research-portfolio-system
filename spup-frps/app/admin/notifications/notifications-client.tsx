'use client'

import { toast } from 'sonner'
import { NotificationFeed } from '@/components/shared/notification-feed'
import {
  useAdminNotificationsQuery,
  useAdminNotificationsReadMutation,
} from '@/lib/query/notifications'

export default function AdminNotificationsPage() {
  const notificationsQuery = useAdminNotificationsQuery({ limit: 100 })
  const readMutation = useAdminNotificationsReadMutation()

  const handleMarkRead = async (notificationId: string) => {
    try {
      await readMutation.mutateAsync({ ids: [notificationId] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update this notification.')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await readMutation.mutateAsync({ markAll: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update notifications.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review new faculty sign-ins and newly added faculty records across the system.
        </p>
      </div>

      <NotificationFeed
        items={notificationsQuery.data?.items ?? []}
        unreadCount={notificationsQuery.data?.unread_count ?? 0}
        isLoading={notificationsQuery.isLoading && !notificationsQuery.data}
        emptyTitle="No activity notifications yet"
        emptyDescription="New faculty sign-ins and new faculty record activity will appear here for administrators."
        onMarkAllRead={() => void handleMarkAllRead()}
        onMarkRead={(notificationId) => void handleMarkRead(notificationId)}
      />
    </div>
  )
}
