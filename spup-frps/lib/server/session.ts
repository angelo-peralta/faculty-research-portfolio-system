import { cookies } from 'next/headers'
import { ApiAuthError, getCurrentAppUser, getDefaultRole } from '@/lib/server/auth'
import type { Session, User, UserRole } from '@/lib/types'

export const ACTIVE_ROLE_COOKIE = 'frp_active_role'

export async function createInitialSession(user: User): Promise<Session> {
  const cookieStore = await cookies()
  const activeRoleCookie = cookieStore.get(ACTIVE_ROLE_COOKIE)?.value as UserRole | undefined
  const activeRole =
    activeRoleCookie && user.roles.includes(activeRoleCookie)
      ? activeRoleCookie
      : getDefaultRole(user.roles)

  return {
    user,
    activeRole,
  }
}

export async function createOptionalInitialSession(): Promise<Session | null> {
  try {
    const { user } = await getCurrentAppUser()
    return createInitialSession(user)
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return null
    }

    throw error
  }
}
