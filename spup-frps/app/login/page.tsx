import { Suspense } from 'react'
import { LoginPageContent } from '@/app/login/login-page-content'
import { AppProviders } from '@/components/providers/app-providers'
import { createOptionalInitialSession } from '@/lib/server/session'

export default async function LoginPage() {
  const initialSession = await createOptionalInitialSession()

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AppProviders
        initialSession={initialSession}
        skipInitialSessionFetch={!initialSession}
      >
        <LoginPageContent />
      </AppProviders>
    </Suspense>
  )
}
