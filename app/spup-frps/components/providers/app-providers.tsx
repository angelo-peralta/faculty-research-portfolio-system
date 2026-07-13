'use client'

import type { ReactNode } from 'react'
import { PwaProvider } from '@/components/pwa/pwa-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { AuthProvider } from '@/lib/auth-context'
import type { Session } from '@/lib/types'

interface AppProvidersProps {
  children: ReactNode
  initialSession?: Session | null
  skipInitialSessionFetch?: boolean
}

export function AppProviders({
  children,
  initialSession = null,
  skipInitialSessionFetch = false,
}: AppProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider
        initialSession={initialSession}
        skipInitialSessionFetch={skipInitialSessionFetch}
      >
        <PwaProvider>{children}</PwaProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
