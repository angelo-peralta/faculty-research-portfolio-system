import { redirect } from 'next/navigation'
import { AppProviders } from '@/components/providers/app-providers'
import { AdminShell } from '@/app/admin/admin-shell'
import { ApiAuthError, getCurrentAppUser } from '@/lib/server/auth'
import { createInitialSession } from '@/lib/server/session'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user

  try {
    ;({ user } = await getCurrentAppUser())
  } catch (error) {
    if (error instanceof ApiAuthError) {
      redirect('/login')
    }

    throw error
  }

  const session = await createInitialSession(user)
  const isAdmin =
    session.user.roles.includes('main-admin') ||
    session.user.roles.includes('secondary-admin')

  if (!isAdmin || session.activeRole === 'faculty') {
    redirect('/faculty/profile')
  }

  return (
    <AppProviders initialSession={session}>
      <AdminShell>{children}</AdminShell>
    </AppProviders>
  )
}
