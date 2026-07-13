export const PWA_ONBOARDING_STORAGE_KEY = 'frp_pwa_onboarding_v1_complete'

export function hasCompletedPwaOnboarding() {
  if (typeof window === 'undefined') {
    return false
  }

  return localStorage.getItem(PWA_ONBOARDING_STORAGE_KEY) === 'true'
}

export function markPwaOnboardingComplete() {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(PWA_ONBOARDING_STORAGE_KEY, 'true')
}
