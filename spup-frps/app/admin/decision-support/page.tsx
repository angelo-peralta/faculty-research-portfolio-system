import AdminDecisionSupportPage from '@/app/admin/decision-support/decision-support-client'
import { queryKeys } from '@/lib/query/query-keys'
import { getCachedDecisionSupportPageData } from '@/lib/server/admin-cache'
import { requireAdminPageAccess } from '@/lib/server/admin-page-auth'
import { createServerQueryClient, ServerHydrationBoundary } from '@/lib/server/query-hydration'

export default async function AdminDecisionSupportRoute() {
  await requireAdminPageAccess()

  const decisionSupport = await getCachedDecisionSupportPageData()
  const queryClient = createServerQueryClient()

  queryClient.setQueryData(queryKeys.admin.decisionSupport(), decisionSupport)

  return (
    <ServerHydrationBoundary queryClient={queryClient}>
      <AdminDecisionSupportPage />
    </ServerHydrationBoundary>
  )
}
