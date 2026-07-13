'use client'

import { toast } from 'sonner'
import { TopHeader } from '@/components/layout/top-header'
import { NotificationFeed } from '@/components/shared/notification-feed'
import {
  useFacultyNotificationsQuery,
  useFacultyNotificationsReadMutation,
} from '@/lib/query/notifications'

export default function FacultyNotificationsPage() {
  const notificationsQuery = useFacultyNotificationsQuery({ limit: 100 })
  const readMutation = useFacultyNotificationsReadMutation()

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
    <div className="min-h-screen">
      <TopHeader
        title="Notifications"
        subtitle="Read broadcast messages from administrators and keep track of updates you have received."
      />

      <div className="space-y-6 p-6">
        <NotificationFeed
          items={notificationsQuery.data?.items ?? []}
          unreadCount={notificationsQuery.data?.unread_count ?? 0}
          isLoading={notificationsQuery.isLoading && !notificationsQuery.data}
          emptyTitle="No messages yet"
          emptyDescription="Broadcasts from administrators will appear here after they are sent to your account."
          onMarkAllRead={() => void handleMarkAllRead()}
          onMarkRead={(notificationId) => void handleMarkRead(notificationId)}
        />
      </div>
    </div>
  )
}
