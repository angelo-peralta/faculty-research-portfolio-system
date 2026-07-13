import FacultyNotificationsPage from '@/app/faculty/notifications/notifications-client'
import { queryKeys } from '@/lib/query/query-keys'
import { getCurrentAppUser } from '@/lib/server/auth'
import { NotificationService } from '@/lib/server/notifications'
import { createServerQueryClient, ServerHydrationBoundary } from '@/lib/server/query-hydration'

export default async function FacultyNotificationsRoute() {
  const { user } = await getCurrentAppUser()
  const queryClient = createServerQueryClient()

  queryClient.setQueryData(
    queryKeys.faculty.notifications({ limit: 100 }),
    await NotificationService.listFacultyNotifications(user.id, { limit: 100 })
  )

  return (
    <ServerHydrationBoundary queryClient={queryClient}>
      <FacultyNotificationsPage />
    </ServerHydrationBoundary>
  )
}
