import AdminFacultyDetailPage from '@/app/admin/faculty/[id]/faculty-detail-client'
import { queryKeys } from '@/lib/query/query-keys'
import { getCurrentAppUser } from '@/lib/server/auth'
import { AdminDataService } from '@/lib/server/admin-data'
import { createServerQueryClient, ServerHydrationBoundary } from '@/lib/server/query-hydration'

export default async function AdminFacultyDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await getCurrentAppUser()
  const queryClient = createServerQueryClient()

  queryClient.setQueryData(
    queryKeys.admin.facultyDetail(id),
    await AdminDataService.getFacultyDetail(id)
  )

  return (
    <ServerHydrationBoundary queryClient={queryClient}>
      <AdminFacultyDetailPage />
    </ServerHydrationBoundary>
  )
}
