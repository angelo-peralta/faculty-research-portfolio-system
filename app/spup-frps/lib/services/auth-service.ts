import { buildAppUrl, getBrowserAppOrigin } from '@/lib/app-origin'
import { clearFacultyOfflineCache } from '@/lib/pwa/client'
import type { Profile, Session as AppSession, User as AppUser, UserRole } from '@/lib/types'

const ACTIVE_ROLE_KEY = 'frp_active_role'
const ACTIVE_ROLE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365
const APP_SESSION_CACHE_KEY = 'frp_app_session'
const APP_SESSION_CACHE_TTL_MS = 5 * 60 * 1000
type AuthChangeEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT'

let currentUserRequest: Promise<AppUser | null> | null = null

interface CachedAppSession {
  user: AppUser
  expiresAt: number
}

class ApiFetchError extends Error {
  status: number
  retryAfterMs: number | null

  constructor(message: string, status: number, retryAfterMs: number | null = null) {
    super(message)
    this.status = status
    this.retryAfterMs = retryAfterMs
  }
}

function getDefaultRole(roles: UserRole[]) {
  if (roles.includes('main-admin')) {
    return 'main-admin'
  }

  if (roles.includes('secondary-admin')) {
    return 'secondary-admin'
  }

  return 'faculty'
}

function getCookieValue(name: string) {
  if (typeof document === 'undefined') {
    return null
  }

  const prefix = `${name}=`
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))

  return match ? decodeURIComponent(match.slice(prefix.length)) : null
}

function persistActiveRole(role: UserRole) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(ACTIVE_ROLE_KEY, role)
  document.cookie = `${ACTIVE_ROLE_KEY}=${encodeURIComponent(role)}; Path=/; Max-Age=${ACTIVE_ROLE_MAX_AGE_SECONDS}; SameSite=Lax`
}

function clearActiveRole() {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem(ACTIVE_ROLE_KEY)
  document.cookie = `${ACTIVE_ROLE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`
}

function readCachedSession(expectedUserId?: string): AppSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawSession = localStorage.getItem(APP_SESSION_CACHE_KEY)

    if (!rawSession) {
      return null
    }

    const cached = JSON.parse(rawSession) as Partial<CachedAppSession>
    const user = cached.user
    const expiresAt = cached.expiresAt

    if (!user || typeof expiresAt !== 'number' || expiresAt <= Date.now()) {
      localStorage.removeItem(APP_SESSION_CACHE_KEY)
      return null
    }

    if (expectedUserId && user.id !== expectedUserId) {
      localStorage.removeItem(APP_SESSION_CACHE_KEY)
      return null
    }

    return toAppSession(user)
  } catch {
    localStorage.removeItem(APP_SESSION_CACHE_KEY)
    return null
  }
}

function writeCachedUser(user: AppUser | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!user) {
    localStorage.removeItem(APP_SESSION_CACHE_KEY)
    return
  }

  const cached: CachedAppSession = {
    user,
    expiresAt: Date.now() + APP_SESSION_CACHE_TTL_MS,
  }

  localStorage.setItem(APP_SESSION_CACHE_KEY, JSON.stringify(cached))
}

function getStoredRole(user: AppUser) {
  if (typeof window === 'undefined') {
    return getDefaultRole(user.roles)
  }

  const cookieRole = getCookieValue(ACTIVE_ROLE_KEY) as UserRole | null

  if (cookieRole && user.roles.includes(cookieRole)) {
    localStorage.setItem(ACTIVE_ROLE_KEY, cookieRole)
    return cookieRole
  }

  const storedRole = localStorage.getItem(ACTIVE_ROLE_KEY) as UserRole | null

  if (storedRole && user.roles.includes(storedRole)) {
    persistActiveRole(storedRole)
    return storedRole
  }

  const nextRole = getDefaultRole(user.roles)
  persistActiveRole(nextRole)
  return nextRole
}

function toAppSession(user: AppUser | null): AppSession | null {
  if (!user) {
    return null
  }

  return {
    user,
    activeRole: getStoredRole(user),
  }
}

function getRetryAfterMs(response: Response) {
  const retryAfter = response.headers.get('retry-after')

  if (!retryAfter) {
    return null
  }

  const seconds = Number(retryAfter)

  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000)
  }

  const retryDate = Date.parse(retryAfter)

  if (Number.isNaN(retryDate)) {
    return null
  }

  return Math.max(0, retryDate - Date.now())
}

function isTransientStatus(status: number) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504
}

function getRetryDelayMs(attempt: number, retryAfterMs: number | null) {
  if (retryAfterMs !== null) {
    return Math.min(retryAfterMs, 5000)
  }

  return Math.min(400 * 2 ** attempt + Math.floor(Math.random() * 300), 3000)
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function fetchJson<T>(
  input: string,
  options: {
    retries?: number
  } = {}
) {
  const retries = options.retries ?? 0

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(input, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (response.status === 401 || response.status === 403) {
        return null
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const message = 'error' in body && typeof body.error === 'string'
          ? body.error
          : `Request failed: ${response.status}`

        throw new ApiFetchError(message, response.status, getRetryAfterMs(response))
      }

      return response.json() as Promise<T>
    } catch (error) {
      const canRetry =
        attempt < retries &&
        (error instanceof ApiFetchError ? isTransientStatus(error.status) : true)

      if (!canRetry) {
        throw error
      }

      await wait(getRetryDelayMs(
        attempt,
        error instanceof ApiFetchError ? error.retryAfterMs : null
      ))
    }
  }

  throw new Error(`Request failed: ${input}`)
}

async function fetchCurrentUser(options: { expectedUserId?: string; force?: boolean } = {}) {
  if (!options.force) {
    const cachedSession = readCachedSession(options.expectedUserId)

    if (cachedSession) {
      return cachedSession.user
    }
  }

  if (currentUserRequest) {
    return currentUserRequest
  }

  currentUserRequest = fetchJson<{ user: AppUser }>('/api/me', { retries: 2 })
    .then((result) => {
      const user = result?.user ?? null
      writeCachedUser(user)
      return user
    })
    .finally(() => {
      currentUserRequest = null
    })

  return currentUserRequest
}

export const AuthService = {
  primeSessionCache(session: AppSession | null): void {
    writeCachedUser(session?.user ?? null)
  },

  async signInWithMicrosoft(): Promise<void> {
    if (typeof window === 'undefined') {
      return
    }

    window.location.href = buildAppUrl('/api/auth/microsoft', {
      origin: getBrowserAppOrigin(),
    }).toString()
  },

  async signOut(): Promise<void> {
    const response = await fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    })

    if (typeof window !== 'undefined') {
      clearActiveRole()
      writeCachedUser(null)
      currentUserRequest = null
      await clearFacultyOfflineCache()
    }

    if (!response.ok) {
      throw new Error('Unable to sign out. Please try again.')
    }
  },

  async getSession(): Promise<AppSession | null> {
    const cachedSession = readCachedSession()

    if (cachedSession) {
      return cachedSession
    }

    const user = await fetchCurrentUser()
    return toAppSession(user)
  },

  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: AppSession | null) => void,
    options?: {
      initialSession?: AppSession | null
      skipInitialSessionFetch?: boolean
    }
  ) {
    let cancelled = false

    if (options?.skipInitialSessionFetch) {
      callback('INITIAL_SESSION', options.initialSession ?? null)
      return () => {
        cancelled = true
      }
    }

    void this.getSession()
      .then((session) => {
        if (!cancelled) {
          callback(session ? 'SIGNED_IN' : 'INITIAL_SESSION', session)
        }
      })
      .catch((error) => {
        console.error('Failed to load current app user:', error)
        if (!cancelled) {
          callback('INITIAL_SESSION', null)
        }
      })

    return () => {
      cancelled = true
    }
  },

  async getAvailableRoles(userId: string): Promise<UserRole[]> {
    const session = await this.getSession()

    if (!session || session.user.id !== userId) {
      return []
    }

    return session.user.roles
  },

  async switchActiveRole(role: UserRole): Promise<AppSession | null> {
    const session = await this.getSession()

    if (!session || !session.user.roles.includes(role) || typeof window === 'undefined') {
      return null
    }

    persistActiveRole(role)

    return {
      ...session,
      activeRole: role,
    }
  },

  persistActiveRole,

  async getFacultyProfileForUser(userId: string): Promise<Profile | null> {
    const session = await this.getSession()

    if (!session || session.user.id !== userId) {
      return null
    }

    return fetchJson<Profile>('/api/me/profile')
  },

  hasRole(user: AppUser, role: UserRole): boolean {
    return user.roles.includes(role)
  },

  isAdmin(user: AppUser): boolean {
    return user.roles.includes('main-admin') || user.roles.includes('secondary-admin')
  },

  isMainAdmin(user: AppUser): boolean {
    return user.roles.includes('main-admin')
  },
}
