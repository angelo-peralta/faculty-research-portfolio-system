import AdminSettingsPage from '@/app/admin/settings/settings-client'
import { queryKeys } from '@/lib/query/query-keys'
import { getCachedAdminSettingsBootstrap } from '@/lib/server/admin-cache'
import { requireAdminPageAccess } from '@/lib/server/admin-page-auth'
import { createServerQueryClient, ServerHydrationBoundary } from '@/lib/server/query-hydration'

export default async function AdminSettingsRoute() {
  await requireAdminPageAccess()

  const settingsBootstrap = await getCachedAdminSettingsBootstrap()
  const queryClient = createServerQueryClient()

  queryClient.setQueryData(queryKeys.admin.settingsBootstrap(), settingsBootstrap)

  return (
    <ServerHydrationBoundary queryClient={queryClient}>
      <AdminSettingsPage />
    </ServerHydrationBoundary>
  )
}
