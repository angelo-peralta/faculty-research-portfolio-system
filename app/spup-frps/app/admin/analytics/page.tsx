import AdminAnalyticsPage from '@/app/admin/analytics/analytics-client'
import { queryKeys } from '@/lib/query/query-keys'
import { getCachedAdminAnalyticsSummary } from '@/lib/server/admin-cache'
import { requireAdminPageAccess } from '@/lib/server/admin-page-auth'
import { createServerQueryClient, ServerHydrationBoundary } from '@/lib/server/query-hydration'

export default async function AdminAnalyticsRoute() {
  await requireAdminPageAccess()

  const initialAnalytics = await getCachedAdminAnalyticsSummary()
  const queryClient = createServerQueryClient()

  queryClient.setQueryData(queryKeys.admin.analytics(), initialAnalytics)

  return (
    <ServerHydrationBoundary queryClient={queryClient}>
      <AdminAnalyticsPage initialAnalytics={initialAnalytics} />
    </ServerHydrationBoundary>
  )
}
