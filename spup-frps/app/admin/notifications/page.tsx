import AdminNotificationsPage from '@/app/admin/notifications/notifications-client'
import { queryKeys } from '@/lib/query/query-keys'
import { getCurrentAppUser } from '@/lib/server/auth'
import { NotificationService } from '@/lib/server/notifications'
import { createServerQueryClient, ServerHydrationBoundary } from '@/lib/server/query-hydration'

export default async function AdminNotificationsRoute() {
  const { user } = await getCurrentAppUser()
  const queryClient = createServerQueryClient()

  queryClient.setQueryData(
    queryKeys.admin.notifications({ limit: 100 }),
    await NotificationService.listAdminNotifications(user.id, { limit: 100 })
  )

  return (
    <ServerHydrationBoundary queryClient={queryClient}>
      <AdminNotificationsPage />
    </ServerHydrationBoundary>
  )
}
