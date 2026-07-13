import { redirect } from 'next/navigation'
import AdminDashboardClient from '@/app/admin/dashboard/dashboard-client'
import { ApiAuthError, getCurrentAppUser } from '@/lib/server/auth'
import { getCachedAdminDashboardData } from '@/lib/server/admin-cache'
import { queryKeys } from '@/lib/query/query-keys'
import { createServerQueryClient, ServerHydrationBoundary } from '@/lib/server/query-hydration'
import { createInitialSession } from '@/lib/server/session'

export default async function AdminDashboardPage() {
  try {
    const { user } = await getCurrentAppUser()
    const session = await createInitialSession(user)
    const isAdmin =
      user.roles.includes('main-admin') ||
      user.roles.includes('secondary-admin')

    if (!isAdmin || session.activeRole === 'faculty') {
      redirect('/faculty/profile')
    }
  } catch (error) {
    if (error instanceof ApiAuthError) {
      redirect('/login')
    }

    throw error
  }

  const initialDashboard = await getCachedAdminDashboardData()
  const queryClient = createServerQueryClient()

  queryClient.setQueryData(queryKeys.admin.dashboard('all'), initialDashboard)

  return (
    <ServerHydrationBoundary queryClient={queryClient}>
      <AdminDashboardClient initialDashboard={initialDashboard} />
    </ServerHydrationBoundary>
  )
}
