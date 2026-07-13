'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User, UserRole } from '@/lib/types'
import { AuthService } from '@/lib/services/auth-service'

interface AuthContextType {
  session: Session | null
  user: User | null
  activeRole: UserRole | null
  isLoading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  switchRole: (role: UserRole) => Promise<void>
  hasRole: (role: UserRole) => boolean
  isAdmin: boolean
  isMainAdmin: boolean
  isFaculty: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({
  children,
  initialSession = null,
  skipInitialSessionFetch = false,
}: {
  children: ReactNode
  initialSession?: Session | null
  skipInitialSessionFetch?: boolean
}) {
  const [session, setSession] = useState<Session | null>(initialSession)
  const [isLoading, setIsLoading] = useState(!initialSession && !skipInitialSessionFetch)

  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      try {
        const existingSession = await AuthService.getSession()
        if (isMounted) {
          setSession(existingSession)
        }
      } catch (error) {
        console.error('Failed to load session:', error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    if (initialSession) {
      AuthService.primeSessionCache(initialSession)
      setSession(initialSession)
      setIsLoading(false)
    } else if (skipInitialSessionFetch) {
      setSession(null)
      setIsLoading(false)
    }

    const unsubscribe = AuthService.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) {
          return
        }

        setSession(nextSession)
        setIsLoading(false)
      },
      {
        initialSession,
        skipInitialSessionFetch: Boolean(initialSession) || skipInitialSessionFetch,
      }
    )

    if (!initialSession && !skipInitialSessionFetch) {
      void loadSession()
    }

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [initialSession, skipInitialSessionFetch])

  const signIn = useCallback(async () => {
    setIsLoading(true)

    try {
      await AuthService.signInWithMicrosoft()
    } catch (error) {
      setIsLoading(false)
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    setIsLoading(true)

    try {
      await AuthService.signOut()
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const switchRole = useCallback(async (role: UserRole) => {
    if (session?.user.roles.includes(role)) {
      AuthService.persistActiveRole(role)
      setSession({
        ...session,
        activeRole: role,
      })
      return
    }

    const nextSession = await AuthService.switchActiveRole(role)

    if (nextSession) {
      setSession(nextSession)
    }
  }, [session])

  const value = useMemo(() => {
    const user = session?.user ?? null
    const isAdmin = user
      ? user.roles.includes('main-admin') || user.roles.includes('secondary-admin')
      : false
    const isMainAdmin = user?.roles.includes('main-admin') ?? false
    const isFaculty = user?.roles.includes('faculty') ?? false

    return {
      session,
      user,
      activeRole: session?.activeRole ?? null,
      isLoading,
      signIn,
      signOut,
      switchRole,
      hasRole: (role: UserRole) => user?.roles.includes(role) ?? false,
      isAdmin,
      isMainAdmin,
      isFaculty,
    }
  }, [session, isLoading, signIn, signOut, switchRole])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
