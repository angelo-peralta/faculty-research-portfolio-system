import { redirect } from 'next/navigation'
import { ApiAuthError, getCurrentAppUser } from '@/lib/server/auth'
import { createInitialSession } from '@/lib/server/session'

export async function requireAdminPageAccess() {
  try {
    const { user } = await getCurrentAppUser()
    const session = await createInitialSession(user)
    const isAdmin =
      session.user.roles.includes('main-admin') ||
      session.user.roles.includes('secondary-admin')

    if (!isAdmin || session.activeRole === 'faculty') {
      redirect('/faculty/profile')
    }

    return { user, session }
  } catch (error) {
    if (error instanceof ApiAuthError) {
      redirect('/login')
    }

    throw error
  }
}
