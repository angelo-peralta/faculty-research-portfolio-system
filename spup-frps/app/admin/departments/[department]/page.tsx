import DepartmentDetailPage from '@/app/admin/departments/[department]/department-detail-client'
import { queryKeys } from '@/lib/query/query-keys'
import { AdminDataService } from '@/lib/server/admin-data'
import { requireAdminPageAccess } from '@/lib/server/admin-page-auth'
import { createServerQueryClient, ServerHydrationBoundary } from '@/lib/server/query-hydration'
import type { AdminDepartmentDetailQuery, Department } from '@/lib/types'

export default async function AdminDepartmentDetailRoute({
  params,
}: {
  params: Promise<{ department: string }>
}) {
  await requireAdminPageAccess()

  const { department } = await params
  const queryClient = createServerQueryClient()
  const defaultDepartmentDetailQuery: AdminDepartmentDetailQuery = {
    department: department as Department,
    search: undefined,
    status: 'all',
    page: 1,
    page_size: 20,
  }

  queryClient.setQueryData(
    queryKeys.admin.departmentDetail(department, {
      search: undefined,
      status: 'all',
      page: 1,
      page_size: 20,
    }),
    await AdminDataService.getDepartmentDetail(defaultDepartmentDetailQuery)
  )

  return (
    <ServerHydrationBoundary queryClient={queryClient}>
      <DepartmentDetailPage />
    </ServerHydrationBoundary>
  )
}
