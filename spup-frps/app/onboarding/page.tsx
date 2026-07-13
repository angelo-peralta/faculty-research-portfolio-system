'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { BrandLogo } from '@/components/auth/auth-brand'
import { usePwa } from '@/components/pwa/pwa-provider'
import { AppProviders } from '@/components/providers/app-providers'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/lib/auth-context'
import { hasCompletedPwaOnboarding, markPwaOnboardingComplete } from '@/lib/pwa/onboarding'
import { ensureWorkspaceRole } from '@/lib/workspace-routing'

const onboardingSlides = [
  {
    eyebrow: 'Welcome',
    title: 'Your SPUP research workspace is now easier to reach',
    description:
      'The Faculty Research Portfolio app gives you a focused place to open your academic records and continue working with your institutional account.',
    image: '/illustrations/onboarding/secure-login.svg',
    imageAlt: 'Illustration of a faculty login and secure access',
  },
  {
    eyebrow: 'Profile',
    title: 'Review your profile and organize your academic records',
    description:
      'Complete core faculty details and organize publications, engagements, and research titles in one place.',
    image: '/illustrations/onboarding/profile-data.svg',
    imageAlt: 'Illustration of faculty profile information and academic records',
  },
  {
    eyebrow: 'Keep It Current',
    title: 'Maintain records that stay ready for reporting and review',
    description:
      'Return to the app regularly to keep your portfolio accurate, visible, and ready for institutional reporting needs.',
    image: '/illustrations/onboarding/updates.svg',
    imageAlt: 'Illustration of ongoing updates and record maintenance',
  },
] as const

function OnboardingContent() {
  const router = useRouter()
  const { hasResolvedDisplayMode, isInstalled } = usePwa()
  const { user, switchRole, isLoading } = useAuth()
  const [activeSlide, setActiveSlide] = useState(0)
  const [isFinishing, setIsFinishing] = useState(false)
  const hasCompletedOnboarding = hasResolvedDisplayMode ? hasCompletedPwaOnboarding() : false

  useEffect(() => {
    if (!hasResolvedDisplayMode) {
      return
    }

    if (!isInstalled) {
      router.replace('/')
      return
    }

    if (!hasCompletedOnboarding) {
      return
    }

    if (isLoading) {
      return
    }

    const redirectAfterCompletion = async () => {
      if (user) {
        router.replace(await ensureWorkspaceRole(user, switchRole))
        return
      }

      router.replace('/login')
    }

    void redirectAfterCompletion()
  }, [
    hasCompletedOnboarding,
    hasResolvedDisplayMode,
    isInstalled,
    isLoading,
    router,
    switchRole,
    user,
  ])

  const handleComplete = async () => {
    markPwaOnboardingComplete()
    setIsFinishing(true)
  }

  useEffect(() => {
    if (!isFinishing || isLoading) {
      return
    }

    const redirectAfterFinish = async () => {
      if (user) {
        router.replace(await ensureWorkspaceRole(user, switchRole))
        return
      }

      router.replace('/login')
    }

    void redirectAfterFinish()
  }, [isFinishing, isLoading, router, switchRole, user])

  if (!hasResolvedDisplayMode || !isInstalled || hasCompletedOnboarding || isFinishing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#0f5124_0%,#14622e_58%,#f5f7f1_150%)] dark:bg-[linear-gradient(180deg,#0c3519_0%,#114523_58%,#0f1712_140%)]">
        <Spinner className="size-6 text-white" />
      </div>
    )
  }

  const slide = onboardingSlides[activeSlide]
  const isFirstSlide = activeSlide === 0
  const isLastSlide = activeSlide === onboardingSlides.length - 1

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,#0f5124_0%,#14622e_46%,#eef3e8_140%)] text-foreground dark:bg-[linear-gradient(180deg,#0c3519_0%,#114523_46%,#101813_130%)]">
      <div className="absolute left-[-7rem] top-10 h-72 w-72 rounded-full bg-white/12 blur-3xl" />
      <div className="absolute right-[-5rem] top-14 h-80 w-80 rounded-full bg-yellow-200/18 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo dark />
            <div className="text-white">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-yellow-100/85">
                SPUP
              </p>
              <h1 className="text-base font-semibold sm:text-lg">Faculty Research Portfolio</h1>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => void handleComplete()}
            className="text-white hover:bg-white/10 hover:text-white"
          >
            Skip
          </Button>
        </header>

        <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-center py-3 sm:py-4">
          <div className="grid h-full w-full flex-1 items-stretch gap-4 sm:gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
            <div
              key={`art-${activeSlide}`}
              className="motion-fade-in relative flex min-h-[11rem] items-center justify-center overflow-hidden rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.05)_100%)] px-4 py-4 backdrop-blur-[2px] sm:min-h-[13rem] sm:px-6 sm:py-5 lg:min-h-0 lg:self-stretch lg:px-8"
            >
              <div className="absolute inset-x-10 top-8 h-20 rounded-full bg-yellow-200/22 blur-3xl" />
              <div className="absolute inset-x-16 bottom-8 h-24 rounded-full bg-primary/10 blur-3xl" />
              <Image
                src={slide.image}
                alt={slide.imageAlt}
                width={520}
                height={420}
                className="relative z-10 h-auto max-h-[28vh] w-full max-w-[16rem] object-contain sm:max-h-[32vh] sm:max-w-[20rem] lg:max-h-[58vh] lg:max-w-[28rem]"
                priority
              />
            </div>

            <div className="flex min-h-0 flex-col justify-between py-1 text-white lg:py-3">
              <div
                key={`content-${activeSlide}`}
                className="motion-fade-up space-y-4 sm:space-y-5"
              >
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="inline-flex items-center rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-yellow-100">
                    {slide.eyebrow}
                  </div>
                  <div className="space-y-2.5 sm:space-y-3">
                    <h2 className="max-w-xl text-[clamp(1.75rem,4vw,2.9rem)] font-semibold leading-[1.05]">
                      {slide.title}
                    </h2>
                    <p className="max-w-xl text-[clamp(0.92rem,1.6vw,1rem)] leading-relaxed text-white/78">
                      {slide.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 border-l border-yellow-200/35 pl-4 text-[clamp(0.84rem,1.3vw,0.94rem)] text-white/76 sm:max-w-lg">
                  <p>
                    Secure Microsoft access keeps your faculty records within the university
                    account you already use.
                  </p>
                  <p>
                    Publications, engagements, and research titles stay organized in one place as
                    your portfolio grows.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 border-t border-white/14 pt-4">
                <div className="flex items-center gap-2">
                  {onboardingSlides.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      aria-label={`Go to slide ${index + 1}`}
                      onClick={() => setActiveSlide(index)}
                      className={`h-2.5 rounded-full transition-all ${
                        index === activeSlide
                          ? 'w-10 bg-yellow-300'
                          : 'w-2.5 bg-white/22 hover:bg-white/38'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isFirstSlide}
                    onClick={() => setActiveSlide((previous) => Math.max(previous - 1, 0))}
                    className="h-10 border-white/20 bg-white/5 px-4 text-white hover:bg-white/10 hover:text-white disabled:opacity-40"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>

                  {isLastSlide ? (
                    <Button
                      type="button"
                      onClick={() => void handleComplete()}
                      className="h-10 bg-yellow-300 px-4 text-[#0f5124] hover:bg-yellow-200"
                    >
                      Continue to Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() =>
                        setActiveSlide((previous) =>
                          Math.min(previous + 1, onboardingSlides.length - 1)
                        )
                      }
                      className="h-10 bg-yellow-300 px-4 text-[#0f5124] hover:bg-yellow-200"
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <AppProviders>
      <OnboardingContent />
    </AppProviders>
  )
}
