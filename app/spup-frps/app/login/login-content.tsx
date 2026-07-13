'use client'

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  BookOpen,
  Copy,
  Download,
  ExternalLink,
  FlaskConical,
  Shield,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { buildAppUrl, getBrowserAppOrigin } from '@/lib/app-origin'
import { useAuth } from '@/lib/auth-context'
import { WorkspaceLoadingState } from '@/components/admin/admin-loading-state'
import { BrandLogo } from '@/components/auth/auth-brand'
import { SignInPanel } from '@/components/auth/sign-in-panel'
import { usePwa } from '@/components/pwa/pwa-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { hasCompletedPwaOnboarding } from '@/lib/pwa/onboarding'
import {
  getInstallGuide,
  INSTALL_MANUAL_GUIDES,
  type InstallGuide,
  type ManualInstallGuideKey,
} from '@/lib/pwa/install-guide'
import { cn } from '@/lib/utils'
import { ensureWorkspaceRole } from '@/lib/workspace-routing'
import { APP_DEVELOPER_NAME, APP_DEVELOPER_EMAIL } from '@/lib/app-meta'
import type { LandingStats } from '@/lib/server/landing-stats'

interface LoginContentProps {
  landingStats: LandingStats
}

function formatStatValue(value: number) {
  return new Intl.NumberFormat().format(value)
}

const webFeatures = [
  {
    icon: BookOpen,
    title: 'Maintain your academic profile',
    description: 'Keep credentials, specialization, and faculty records accurate and ready for review.',
  },
  {
    icon: FlaskConical,
    title: 'Track research outputs',
    description: 'Record publications, research titles, and academic engagements in one organized workspace.',
  },
  {
    icon: Shield,
    title: 'Keep records complete',
    description:
      'Review your portfolio details and complete missing information at your own pace.',
  },
] as const

const workflowSteps = [
  {
    step: '01',
    title: 'Sign in with your SPUP account',
    description: 'Access the platform using the university Microsoft account assigned to you.',
  },
  {
    step: '02',
    title: 'Complete your profile',
    description: 'Review onboarding details and update key records in one workspace.',
  },
  {
    step: '03',
    title: 'Keep your records updated',
    description: 'Update publications, engagements, and research outputs as your work grows over time.',
  },
] as const

const getMotionDelayStyle = (delay: number): CSSProperties =>
  ({ '--motion-delay': `${delay}s` }) as CSSProperties

async function copyTextToClipboard(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function LandingReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
}: {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'left' | 'right'
}) {
  const animationClass =
    direction === 'left'
      ? 'motion-landing-reveal-left'
      : direction === 'right'
        ? 'motion-landing-reveal-right'
        : 'motion-landing-reveal'

  return (
    <div
      className={cn(animationClass, className)}
      style={getMotionDelayStyle(delay)}
    >
      {children}
    </div>
  )
}

function ManualInstallGuideCard({
  guideKey,
  highlighted = false,
  className,
  style,
}: {
  guideKey: ManualInstallGuideKey
  highlighted?: boolean
  className?: string
  style?: CSSProperties
}) {
  const guide = INSTALL_MANUAL_GUIDES[guideKey]

  return (
    <div
      className={cn(
        'rounded-[1.5rem] border border-primary/12 bg-card/85 p-5 shadow-sm backdrop-blur-sm',
        highlighted && 'border-primary/28 bg-primary/[0.04] shadow-primary/5',
        className
      )}
      style={style}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">{guide.label}</p>
          <h4 className="text-lg font-semibold text-foreground">{guide.title}</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">{guide.description}</p>
        </div>
        {highlighted ? (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Recommended
          </Badge>
        ) : null}
      </div>

      <ol className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        {guide.steps.map((step, index) => (
          <li key={step}>
            {index + 1}. {step}
          </li>
        ))}
      </ol>
    </div>
  )
}

function InstallGuideSection({
  canInstall,
  isInstalled,
  onInstallApp,
}: {
  canInstall: boolean
  isInstalled: boolean
  onInstallApp: () => Promise<void>
}) {
  const [clientInstallContext, setClientInstallContext] = useState<{
    userAgent: string
    maxTouchPoints: number
    currentUrl: string
  }>({
    userAgent: '',
    maxTouchPoints: 0,
    currentUrl: '',
  })
  const [installTab, setInstallTab] = useState<ManualInstallGuideKey | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setClientInstallContext({
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
        currentUrl: buildAppUrl('/', { origin: getBrowserAppOrigin() }).toString(),
      })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const installGuide: InstallGuide = getInstallGuide({
    ...clientInstallContext,
    canInstall,
    isInstalled,
  })
  const activeInstallTab = installTab ?? installGuide.manualGuideKey

  const handleCopyLink = async () => {
    if (!installGuide.currentUrl) {
      toast.error('Unable to prepare the landing page link right now.')
      return
    }

    try {
      await copyTextToClipboard(installGuide.currentUrl)
      toast.success('Link copied. Open Safari and paste it to install the app.')
    } catch (error) {
      console.error('Failed to copy install link:', error)
      toast.error('Unable to copy the landing page link automatically.')
    }
  }

  const installStatusLabel = isInstalled
    ? 'Installed on this device'
    : canInstall
      ? 'Install prompt ready'
      : 'Manual install guide'

  return (
    <div className="space-y-6">
      {installGuide.isMobile ? (
        <LandingReveal
          className="rounded-[1.75rem] border border-primary/14 bg-[linear-gradient(135deg,rgba(20,98,46,0.06)_0%,rgba(254,204,4,0.08)_130%)] p-5 shadow-sm sm:p-6"
          delay={0.06}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {installGuide.detectedLabel}
                </Badge>
                <Badge variant="outline" className="border-primary/12 bg-background/75">
                  {installStatusLabel}
                </Badge>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-semibold text-foreground">{installGuide.title}</h4>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {installGuide.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:max-w-xs lg:justify-end">
              {installGuide.recommendedAction === 'native-install' ? (
                <Button
                  type="button"
                  onClick={() => void onInstallApp()}
                  className="gradient-primary hover:opacity-95"
                >
                  <Download className="h-4 w-4" />
                  {installGuide.primaryButtonLabel ?? 'Install App'}
                </Button>
              ) : null}

              {installGuide.recommendedAction === 'try-chrome' && installGuide.primaryHref ? (
                <Button asChild>
                  <a href={installGuide.primaryHref}>
                    <ExternalLink className="h-4 w-4" />
                    {installGuide.primaryButtonLabel ?? 'Try Chrome'}
                  </a>
                </Button>
              ) : null}

              {installGuide.platform === 'ios' &&
              installGuide.browser !== 'safari' &&
              !isInstalled ? (
                <Button type="button" variant="outline" onClick={() => void handleCopyLink()}>
                  <Copy className="h-4 w-4" />
                  {installGuide.primaryButtonLabel ?? 'Copy Link'}
                </Button>
              ) : null}
            </div>
          </div>

          <ol className="mt-6 space-y-2 text-sm leading-relaxed text-muted-foreground">
            {installGuide.steps.map((step, index) => (
              <li key={step}>
                {index + 1}. {step}
              </li>
            ))}
          </ol>
        </LandingReveal>
      ) : null}

      <LandingReveal className="md:hidden" delay={0.12}>
        <Tabs
          value={activeInstallTab}
          onValueChange={(value) => setInstallTab(value as ManualInstallGuideKey)}
          className="gap-4"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-primary/5 p-1">
            <TabsTrigger value="android">Android</TabsTrigger>
            <TabsTrigger value="ios">iPhone</TabsTrigger>
          </TabsList>

          <TabsContent value="android" className="mt-0">
            <ManualInstallGuideCard
              guideKey="android"
              highlighted={installGuide.isMobile && installGuide.manualGuideKey === 'android'}
            />
          </TabsContent>

          <TabsContent value="ios" className="mt-0">
            <ManualInstallGuideCard
              guideKey="ios"
              highlighted={installGuide.isMobile && installGuide.manualGuideKey === 'ios'}
            />
          </TabsContent>
        </Tabs>
      </LandingReveal>

      <div className="hidden gap-6 md:grid md:grid-cols-2">
        <LandingReveal direction="left" delay={0.08}>
          <ManualInstallGuideCard
            guideKey="android"
            highlighted={installGuide.isMobile && installGuide.manualGuideKey === 'android'}
          />
        </LandingReveal>
        <LandingReveal direction="right" delay={0.16}>
          <ManualInstallGuideCard
            guideKey="ios"
            highlighted={installGuide.isMobile && installGuide.manualGuideKey === 'ios'}
          />
        </LandingReveal>
      </div>
    </div>
  )
}

function WebLandingContent({
  landingStats,
  onOpenSignIn,
  canInstall,
  isInstalled,
  onInstallApp,
}: {
  landingStats: LandingStats
  onOpenSignIn: () => void
  canInstall: boolean
  isInstalled: boolean
  onInstallApp: () => Promise<void>
}) {
  const scrollToManage = () => {
    document.getElementById('what-you-can-manage')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <div className="motion-landing-shell relative overflow-hidden bg-background text-foreground">
      <section className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(135deg,#145f2d_0%,#0f4d22_54%,#d8b335_182%)] text-white">
        <div
          className="motion-landing-glow absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)`,
            backgroundSize: '56px 56px',
          }}
        />
        <div
          className="motion-landing-orb absolute left-[-8rem] top-12 h-80 w-80 rounded-full bg-white/12 blur-3xl"
          style={getMotionDelayStyle(0.18)}
        />
        <div
          className="motion-landing-orb absolute right-[-6rem] top-24 h-96 w-96 rounded-full bg-yellow-200/18 blur-3xl"
          style={getMotionDelayStyle(0.3)}
        />
        <div
          className="motion-landing-glow absolute inset-x-0 bottom-0 h-40"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--background))' }}
        />

        <div className="relative z-10 flex min-h-screen flex-col">
          <header
            className="motion-landing-reveal mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10"
            style={getMotionDelayStyle(0.08)}
          >
            <div className="flex items-center gap-3">
              <BrandLogo dark />
              <div>
                <h1 className="text-lg font-semibold text-white sm:text-xl">SPUP</h1>
                <p className="text-xs text-white/72 sm:text-sm">
                  Faculty Research Portfolio System
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={onOpenSignIn}
              className="bg-white/10 text-white shadow-[0_0_28px_rgba(255,213,79,0.16)] backdrop-blur-sm hover:bg-white/20"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </header>

          <div className="mx-auto flex w-full max-w-6xl flex-1 items-center px-5 pb-14 pt-4 text-center sm:px-8 lg:px-10 lg:pb-20">
            <div className="mx-auto w-full max-w-4xl">
              <div className="mx-auto max-w-3xl">
                <div
                  className="motion-landing-reveal inline-flex max-w-full items-center gap-2 rounded-full border border-yellow-200/25 bg-yellow-200/12 px-3 py-1.5"
                  style={getMotionDelayStyle(0.16)}
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-yellow-200" />
                  <span className="truncate text-xs font-medium text-yellow-100 sm:text-sm">
                    Institutional research workspace
                  </span>
                </div>

                <div
                  className="motion-landing-reveal mt-6 max-w-3xl space-y-5"
                  style={getMotionDelayStyle(0.26)}
                >
                  <h2 className="text-4xl font-bold leading-[1.04] text-balance sm:text-5xl lg:text-6xl">
                    SPUP Faculty Research Portfolio
                  </h2>
                  <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/82 sm:text-lg lg:text-xl">
                    One place to build, update, and report your research profile with
                    institutional sign-in. Track publications, engagements, research titles, and
                    academic credentials in a format ready for reporting, review, and portfolio
                    growth.
                  </p>
                </div>

                <div
                  className="motion-landing-reveal mt-7 flex flex-col justify-center gap-3 sm:flex-row"
                  style={getMotionDelayStyle(0.38)}
                >
                  <Button
                    type="button"
                    onClick={onOpenSignIn}
                    className="h-11 bg-white text-primary hover:bg-white/92"
                  >
                    Sign in with Microsoft
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={scrollToManage}
                    className="h-11 border border-white/15 bg-white/10 text-white hover:bg-white/16"
                  >
                    See What You Can Manage
                  </Button>
                </div>

                <div
                  className="motion-landing-reveal mt-12 py-6"
                  style={getMotionDelayStyle(0.48)}
                >
                  <div className="grid gap-5 sm:grid-cols-3">
                    <div>
                      <p className="text-3xl font-bold text-white sm:text-4xl">
                        {formatStatValue(landingStats.activeFacultyCount)}
                      </p>
                      <p className="mt-1 text-sm text-white/72">Active Faculty</p>
                    </div>
                    <div className="sm:px-6">
                      <p className="text-3xl font-bold text-white sm:text-4xl">
                        {formatStatValue(landingStats.publicationsCount)}
                      </p>
                      <p className="mt-1 text-sm text-white/72">Publications</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white sm:text-4xl">
                        {formatStatValue(landingStats.departmentsCount)}
                      </p>
                      <p className="mt-1 text-sm text-white/72">Departments</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10">
        <main className="mx-auto max-w-5xl space-y-12 px-5 py-14 sm:px-8 md:space-y-14 lg:px-10 lg:py-16">
          <section
            id="what-you-can-manage"
            className="scroll-mt-24 border-t border-primary/10 pt-12 lg:scroll-mt-28"
          >
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <LandingReveal className="space-y-4" delay={0.04}>
                <p className="text-sm font-medium text-primary">For Faculty</p>
                <h3 className="text-3xl font-semibold leading-tight text-foreground">
                  Keep your research portfolio clear, current, and ready for review
                </h3>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  The system is designed for faculty who need one consistent place to maintain
                  profile details and track academic work in one place.
                </p>
              </LandingReveal>

              <div className="grid gap-6">
                {webFeatures.map((feature, index) => (
                  <LandingReveal
                    key={feature.title}
                    className="border-l-2 border-primary/14 pl-5"
                    delay={0.1 + index * 0.08}
                    direction={index % 2 === 0 ? 'left' : 'right'}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 rounded-2xl bg-primary/[0.08] p-3 text-primary">
                        <feature.icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-foreground">{feature.title}</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </LandingReveal>
                ))}
              </div>
            </div>
          </section>

          <section className="border-t border-primary/10 pt-10">
            <LandingReveal className="max-w-2xl space-y-3" delay={0.04}>
              <p className="text-sm font-medium text-primary">Simple workflow</p>
              <h3 className="text-2xl font-semibold text-foreground sm:text-3xl">
                From sign-in to a complete faculty profile
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                The workflow stays focused: access your account, review your profile details,
                then keep your portfolio current over time.
              </p>
            </LandingReveal>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {workflowSteps.map((step, index) => (
                <LandingReveal
                  key={step.step}
                  className="border-t border-primary/12 pt-4"
                  delay={0.1 + index * 0.08}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                    {step.step}
                  </div>
                  <p className="mt-3 text-lg font-semibold text-foreground">{step.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </LandingReveal>
              ))}
            </div>
          </section>

          <section className="border-t border-primary/10 pt-10">
            <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
              <LandingReveal className="space-y-3" delay={0.04} direction="left">
                <p className="text-sm font-medium text-primary">Portfolio Continuity</p>
                <h3 className="text-2xl font-semibold text-foreground">
                  Keep existing records useful
                </h3>
              </LandingReveal>
              <LandingReveal
                className="space-y-4 border-l-2 border-primary/14 pl-5"
                delay={0.12}
                direction="right"
              >
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Your imported records now live in the same portfolio tables as new entries, so
                  faculty can keep reviewing and improving them inside the normal workflow.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Incomplete records can still be completed later inside the profile, publication,
                  engagement, and research modules.
                </p>
              </LandingReveal>
            </div>
          </section>

          <section className="border-t border-primary/10 pt-10">
            <div className="space-y-8">
              <LandingReveal className="mx-auto max-w-2xl space-y-3 text-center" delay={0.04}>
                <p className="text-sm font-medium text-primary">Install on your phone</p>
                <h3 className="text-2xl font-semibold text-foreground sm:text-3xl">
                  Save the system as an app
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Install the Faculty Research Portfolio on Android or iPhone for faster access
                  from your home screen.
                </p>
              </LandingReveal>

              <InstallGuideSection
                canInstall={canInstall}
                isInstalled={isInstalled}
                onInstallApp={onInstallApp}
              />
            </div>
          </section>

          <LandingReveal className="border-t border-primary/10 pt-8" delay={0.06}>
            <p className="text-sm font-medium text-primary">Support</p>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">
              Need help accessing the system?
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Contact the CPRINT Office if you need help with access,
              account status, or onboarding. This system was developed by {APP_DEVELOPER_NAME}. Only
              authorized SPUP faculty and staff may access this system.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Developer contact:{' '}
              <a
                href={`mailto:${APP_DEVELOPER_EMAIL}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {APP_DEVELOPER_EMAIL}
              </a>
            </p>
          </LandingReveal>
        </main>
      </div>
    </div>
  )
}

export function LoginContent({ landingStats }: LoginContentProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, signIn, switchRole, isLoading } = useAuth()
  const { hasResolvedDisplayMode, canInstall, installApp, isInstalled } = usePwa()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSignInPanelOpen, setIsSignInPanelOpen] = useState(false)
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const handledAuthErrorRef = useRef<string | null>(null)
  const signInRequested = searchParams.get('signin') === '1'
  const authError = searchParams.get('error')
  const hasAuthError =
    authError === 'auth-callback' ||
    authError === 'inactive-account' ||
    authError === 'invalid-domain'
  const isDesktopPanelOpen = isSignInPanelOpen || signInRequested || hasAuthError
  const hasCompletedStandaloneOnboarding =
    hasResolvedDisplayMode && isInstalled ? hasCompletedPwaOnboarding() : false

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const syncViewport = () => setIsDesktopViewport(mediaQuery.matches)

    syncViewport()
    mediaQuery.addEventListener('change', syncViewport)

    return () => mediaQuery.removeEventListener('change', syncViewport)
  }, [])

  useEffect(() => {
    if (!hasResolvedDisplayMode || !isInstalled) {
      return
    }

    if (!hasCompletedStandaloneOnboarding) {
      router.replace('/onboarding')
      return
    }

    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [
    hasCompletedStandaloneOnboarding,
    hasResolvedDisplayMode,
    isInstalled,
    isLoading,
    router,
    user,
  ])

  useEffect(() => {
    if (isLoading || !user || !hasResolvedDisplayMode) {
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

  useEffect(() => {
    const authCode = searchParams.get('code')

    if (authCode) {
      window.location.replace(
        buildAppUrl('/auth/callback', {
          origin: getBrowserAppOrigin(),
          searchParams,
        }).toString()
      )
      return
    }

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
  }, [authError, searchParams])

  if (searchParams.get('code')) {
    return <WorkspaceLoadingState fullscreen />
  }

  if (hasResolvedDisplayMode && isInstalled) {
    return <WorkspaceLoadingState fullscreen />
  }

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

  const handleInstallApp = async () => {
    const outcome = await installApp()

    if (outcome === 'accepted') {
      toast.success('App installation started.')
      return
    }

    if (outcome === 'dismissed') {
      toast.message('Installation was dismissed.')
      return
    }

    toast.message('Install prompt is not available on this device right now.')
  }

  const handleDrawerChange = (nextOpen: boolean) => {
    setIsSignInPanelOpen(nextOpen)

    if (nextOpen || (!signInRequested && !hasAuthError)) {
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.delete('signin')
    nextSearchParams.delete('error')

    const nextUrl = nextSearchParams.toString()
      ? `${pathname}?${nextSearchParams.toString()}`
      : pathname

    router.replace(nextUrl)
  }

  return (
    <div className="min-h-screen">
      <WebLandingContent
        landingStats={landingStats}
        onOpenSignIn={() => setIsSignInPanelOpen(true)}
        canInstall={canInstall}
        isInstalled={isInstalled}
        onInstallApp={handleInstallApp}
      />

      {isDesktopPanelOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="landing-sign-in-title"
          className="fixed inset-0 z-[60]"
        >
          <button
            type="button"
            aria-label="Close sign in panel"
            className="absolute inset-0 bg-black/50"
            onClick={() => handleDrawerChange(false)}
          />
          <div
            className={
              isDesktopViewport
                ? 'absolute inset-y-0 right-0 flex h-full w-full max-w-[520px] flex-col border-l border-white/10 bg-background/96 shadow-2xl backdrop-blur-xl'
                : 'absolute inset-0 flex h-[100dvh] flex-col bg-background/98 shadow-2xl backdrop-blur-xl'
            }
          >
            <header
              className={
                isDesktopViewport
                  ? 'border-b border-border/60 px-8 py-6 text-left'
                  : 'border-b border-border/60 px-6 py-5 text-left sm:px-8'
              }
            >
              <div className="flex items-center gap-3 pr-10">
                <BrandLogo />
                <div>
                  <h2 id="landing-sign-in-title" className="text-xl font-semibold text-foreground">
                    Faculty Research
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Sign in with your institutional Microsoft account.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4"
                onClick={() => handleDrawerChange(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </header>

            <div
              className={
                isDesktopViewport
                  ? 'flex-1 overflow-y-auto px-8 py-8'
                  : 'flex flex-1 items-center overflow-y-auto px-6 py-6 sm:px-8'
              }
            >
              <div className={isDesktopViewport ? undefined : 'mx-auto w-full max-w-md'}>
                <SignInPanel
                  isLoading={isLoading}
                  isSigningIn={isSigningIn}
                  onSignIn={handleSignIn}
                />

                <p className="mt-6 text-center text-xs text-muted-foreground">
                  By signing in, you agree to the university&apos;s data privacy policy and terms
                  of service.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
