import { APP_BUILD_ID } from '@/lib/app-meta'

export type NotificationPermissionState = NotificationPermission | 'unsupported'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

const PWA_CACHE_PREFIX = 'frp-'
const FACULTY_PAGE_CACHE_PREFIX = `${PWA_CACHE_PREFIX}faculty-pages-`
const FACULTY_API_CACHE_PREFIX = `${PWA_CACHE_PREFIX}faculty-api-`
const FACULTY_PAGE_CACHE = `${FACULTY_PAGE_CACHE_PREFIX}${APP_BUILD_ID}`
const FACULTY_API_CACHE = `${FACULTY_API_CACHE_PREFIX}${APP_BUILD_ID}`

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const normalized = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(normalized)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

export function bufferToBase64(buffer: ArrayBuffer | null) {
  if (!buffer) {
    return ''
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return window.btoa(binary)
}

export async function clearFacultyOfflineCache() {
  if (typeof window === 'undefined') {
    return
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      registration.active?.postMessage({ type: 'CLEAR_FACULTY_DATA' })
    } catch {
      // Ignore service worker readiness failures during sign out.
    }
  }

  if ('caches' in window) {
    const cacheKeys = await caches.keys()
    await Promise.all(
      cacheKeys
        .filter(
          (key) =>
            key === FACULTY_PAGE_CACHE ||
            key === FACULTY_API_CACHE ||
            key.startsWith(FACULTY_PAGE_CACHE_PREFIX) ||
            key.startsWith(FACULTY_API_CACHE_PREFIX)
        )
        .map((key) => caches.delete(key))
    )
  }
}

export async function clearAllPwaCaches() {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return
  }

  const cacheKeys = await caches.keys()
  await Promise.all(
    cacheKeys
      .filter((key) => key.startsWith(PWA_CACHE_PREFIX))
      .map((key) => caches.delete(key))
  )
}

export async function unregisterServiceWorkers() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  const registrations = await navigator.serviceWorker.getRegistrations()
  const results = await Promise.all(registrations.map((registration) => registration.unregister()))

  return results.some(Boolean)
}
