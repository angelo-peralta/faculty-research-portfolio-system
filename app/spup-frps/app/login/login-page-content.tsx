'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { BrandLogo } from '@/components/auth/auth-brand'
import { SignInPanel } from '@/components/auth/sign-in-panel'
import { usePwa } from '@/components/pwa/pwa-provider'
import { useAuth } from '@/lib/auth-context'
import { hasCompletedPwaOnboarding } from '@/lib/pwa/onboarding'
import { ensureWorkspaceRole } from '@/lib/workspace-routing'

export function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { hasResolvedDisplayMode, isInstalled } = usePwa()
  const { user, signIn, switchRole, isLoading } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const handledAuthErrorRef = useRef<string | null>(null)
  const authError = searchParams.get('error')
  const hasCompletedStandaloneOnboarding =
    hasResolvedDisplayMode && isInstalled ? hasCompletedPwaOnboarding() : false

  useEffect(() => {
    if (authError === 'auth-callback') {
      if (handledAuthErrorRef.current === authError) {
        return
      }

      handledAuthErrorRef.current = authError
      toast.error('Authentication failed. Please try signing in again.')
      return
    }

    if (authError === 'inactive-account') {
      if (handledAuthErrorRef.current === authError) {
        return
      }

      handledAuthErrorRef.current = authError
      toast.error('Your account is inactive. Please contact a main administrator.')
      return
    }

    if (authError === 'invalid-domain') {
      if (handledAuthErrorRef.current === authError) {
        return
      }

      handledAuthErrorRef.current = authError
      toast.error('Only @spup.edu.ph accounts can sign in to this system.')
      return
    }

    handledAuthErrorRef.current = null
  }, [authError])

  useEffect(() => {
    if (!hasResolvedDisplayMode) {
      return
    }

    if (isInstalled && !hasCompletedStandaloneOnboarding) {
      router.replace('/onboarding')
    }
  }, [
    hasCompletedStandaloneOnboarding,
    hasResolvedDisplayMode,
    isInstalled,
    router,
  ])

  useEffect(() => {
    if (!hasResolvedDisplayMode || isLoading || !user) {
      return
    }

    const redirectToWorkspace = async () => {
      if (isInstalled && !hasCompletedStandaloneOnboarding) {
        router.replace('/onboarding')
        return
      }

      router.replace(await ensureWorkspaceRole(user, switchRole))
    }

    void redirectToWorkspace()
  }, [
    hasCompletedStandaloneOnboarding,
    hasResolvedDisplayMode,
    isInstalled,
    isLoading,
    router,
    switchRole,
    user,
  ])

  const handleSignIn = async () => {
    setIsSigningIn(true)

    try {
      await signIn()
    } catch (error) {
      console.error('Failed to start sign-in:', error)
      toast.error('Unable to start Microsoft sign-in.')
      setIsSigningIn(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f6f8f2_0%,#edf3e7_100%)] dark:bg-[linear-gradient(180deg,#0f1612_0%,#16201a_100%)]">
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(20,98,46,0.18),transparent_68%)]" />
      <div className="absolute right-[-5rem] top-16 h-72 w-72 rounded-full bg-yellow-200/35 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 py-12 sm:px-8 lg:px-10">
        <div className="max-w-xl space-y-8">
          <div className="motion-fade-up space-y-5">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to landing page
            </Link>

            <div className="flex items-center gap-4">
              <BrandLogo />
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary/75">
                  SPUP
                </p>
                <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
                  Faculty Research Portfolio
                </h1>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                Sign in with your institutional Microsoft account to open your research portfolio
                and continue updating your faculty records.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Secure access is available only to authorized SPUP faculty and staff.
              </p>
            </div>
          </div>

          <div className="motion-fade-up-delay-1 max-w-lg">
            <SignInPanel
              isLoading={isLoading}
              isSigningIn={isSigningIn}
              onSignIn={handleSignIn}
              variant="compact"
            />
          </div>

          <p className="motion-fade-up-delay-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            If you need help with access or account status, contact the research office or your
            system administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
