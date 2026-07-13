import AdminDepartmentsPage from '@/app/admin/departments/departments-client'
import { requireAdminPageAccess } from '@/lib/server/admin-page-auth'
import { getCachedAdminDepartmentsSummary } from '@/lib/server/admin-cache'

export default async function AdminDepartmentsRoute() {
  await requireAdminPageAccess()
  const departments = await getCachedAdminDepartmentsSummary()

  return <AdminDepartmentsPage initialDepartments={departments} />
}
