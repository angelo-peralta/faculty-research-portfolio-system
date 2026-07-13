import { Suspense } from 'react'
import { LoginContent } from '@/app/login/login-content'
import { AppProviders } from '@/components/providers/app-providers'
import { getCachedLandingStats } from '@/lib/server/landing-stats'
import { createOptionalInitialSession } from '@/lib/server/session'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [landingStats, initialSession] = await Promise.all([
    getCachedLandingStats(),
    createOptionalInitialSession(),
  ])

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AppProviders
        initialSession={initialSession}
        skipInitialSessionFetch={!initialSession}
      >
        <LoginContent landingStats={landingStats} />
      </AppProviders>
    </Suspense>
  )
}
