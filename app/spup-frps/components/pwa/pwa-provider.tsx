'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/lib/auth-context'
import {
  clearAllPwaCaches,
  clearFacultyOfflineCache,
  type BeforeInstallPromptEvent,
  bufferToBase64,
  type NotificationPermissionState,
  unregisterServiceWorkers,
  urlBase64ToUint8Array,
} from '@/lib/pwa/client'
import { APP_BUILD_ID, APP_VERSION } from '@/lib/app-meta'
import { ProfileService } from '@/lib/services/profile-service'

type PwaUpdateStatus = 'idle' | 'checking' | 'required' | 'updating' | 'error'

interface RequiredUpdateState {
  status: PwaUpdateStatus
  latestBuildId?: string
  latestVersion?: string
  message?: string
}

interface AppVersionPayload {
  buildId: string
  version: string
}

interface PwaContextType {
  isServiceWorkerReady: boolean
  canInstall: boolean
  isInstalled: boolean
  hasResolvedDisplayMode: boolean
  installApp: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
  isUpdateRequired: boolean
  updateStatus: PwaUpdateStatus
  latestVersion: string | null
  updateApp: () => Promise<void>
  retryUpdateCheck: () => Promise<void>
  isPushSupported: boolean
  notificationPermission: NotificationPermissionState
  isPushSubscribed: boolean
  subscribeToPush: () => Promise<void>
  unsubscribeFromPush: () => Promise<void>
}

const PwaContext = createContext<PwaContextType | undefined>(undefined)
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function detectInstalled() {
  if (typeof window === 'undefined') {
    return false
  }

  const standaloneMatch = window.matchMedia('(display-mode: standalone)').matches
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  const navigatorMatch = Boolean(navigatorWithStandalone.standalone)

  return standaloneMatch || navigatorMatch
}

function scheduleIdleTask(task: () => void, timeout = 2500) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    cancelIdleCallback?: (handle: number) => void
  }

  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(task, { timeout })
    return () => idleWindow.cancelIdleCallback?.(handle)
  }

  const handle = window.setTimeout(task, Math.min(timeout, 1000))
  return () => window.clearTimeout(handle)
}

function isAppVersionPayload(value: unknown): value is AppVersionPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as Partial<AppVersionPayload>

  return typeof payload.buildId === 'string' && typeof payload.version === 'string'
}

async function fetchLatestAppVersion() {
  const response = await fetch(`/api/version?current=${encodeURIComponent(APP_BUILD_ID)}&t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  })

  if (!response.ok) {
    throw new Error('Version check failed.')
  }

  const payload: unknown = await response.json()

  if (!isAppVersionPayload(payload)) {
    throw new Error('Version response was invalid.')
  }

  return payload
}

function waitForWaitingWorker(registration: ServiceWorkerRegistration, timeout = 20000) {
  return new Promise<ServiceWorker | null>((resolve) => {
    if (registration.waiting) {
      resolve(registration.waiting)
      return
    }

    let trackedWorker: ServiceWorker | null = null
    const timeoutHandle = window.setTimeout(() => {
      resolveWorker(registration.waiting)
    }, timeout)

    function cleanup() {
      registration.removeEventListener('updatefound', handleUpdateFound)
      trackedWorker?.removeEventListener('statechange', handleStateChange)
      window.clearTimeout(timeoutHandle)
    }

    function resolveWorker(worker: ServiceWorker | null) {
      cleanup()
      resolve(worker)
    }

    function handleStateChange() {
      if (!trackedWorker) {
        return
      }

      if (trackedWorker.state === 'installed' || trackedWorker.state === 'activated') {
        resolveWorker(trackedWorker)
      }
    }

    function trackWorker(worker: ServiceWorker | null) {
      if (!worker) {
        return
      }

      trackedWorker?.removeEventListener('statechange', handleStateChange)
      trackedWorker = worker

      if (worker.state === 'installed' || worker.state === 'activated') {
        resolveWorker(worker)
        return
      }

      worker.addEventListener('statechange', handleStateChange)
    }

    function handleUpdateFound() {
      trackWorker(registration.installing)
    }

    registration.addEventListener('updatefound', handleUpdateFound)
    trackWorker(registration.installing)
  })
}

function RequiredUpdateGate({
  updateState,
  onRetryCheck,
  onUpdate,
}: {
  updateState: RequiredUpdateState
  onRetryCheck: () => void
  onUpdate: () => void
}) {
  if (updateState.status === 'idle' || updateState.status === 'checking') {
    return null
  }

  const isUpdating = updateState.status === 'updating'
  const isError = updateState.status === 'error'
  const hasKnownUpdate = Boolean(updateState.latestBuildId)
  const canStartUpdate = updateState.status === 'required' || (isError && hasKnownUpdate)
  const Icon = isError ? WifiOff : updateState.status === 'required' ? AlertTriangle : RefreshCw
  const title = isUpdating
    ? 'Updating app'
    : 'Update required'
  const description = isUpdating
    ? 'Downloading and applying the latest version. The app will reopen automatically.'
    : isError
      ? updateState.message ?? 'Connect to the internet and retry before continuing.'
      : 'A newer FRP build is available and must be applied before you continue.'
  const buttonLabel = isUpdating
    ? 'Updating'
    : canStartUpdate
      ? 'Update Now'
      : 'Retry'

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="pwa-required-update-title"
      aria-describedby="pwa-required-update-description"
      className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-background/95 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            {isUpdating ? (
              <Spinner className="size-5" />
            ) : (
              <Icon className="size-5" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h2 id="pwa-required-update-title" className="text-lg font-semibold leading-tight">
              {title}
            </h2>
            <p id="pwa-required-update-description" className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
            <p className="text-xs text-muted-foreground">
              Current version {APP_VERSION}
              {updateState.latestVersion && updateState.latestVersion !== APP_VERSION
                ? ` - Latest version ${updateState.latestVersion}`
                : ''}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <Button
            className="w-full"
            disabled={isUpdating}
            onClick={canStartUpdate ? onUpdate : onRetryCheck}
          >
            {isUpdating ? <Spinner /> : <RefreshCw />}
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [hasResolvedDisplayMode, setHasResolvedDisplayMode] = useState(false)
  const [updateState, setUpdateState] = useState<RequiredUpdateState>({ status: 'idle' })
  const isApplyingUpdateRef = useRef(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported'
    }

    return Notification.permission
  })
  const [isPushSubscribed, setIsPushSubscribed] = useState(false)

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

  const checkForRequiredUpdate = useCallback(async () => {
    if (!IS_PRODUCTION || typeof window === 'undefined') {
      setUpdateState({ status: 'idle' })
      return
    }

    setUpdateState((current) =>
      current.status === 'updating' ? current : { ...current, status: 'checking', message: undefined }
    )

    try {
      const latestVersion = await fetchLatestAppVersion()

      if (latestVersion.buildId !== APP_BUILD_ID) {
        setUpdateState({
          status: 'required',
          latestBuildId: latestVersion.buildId,
          latestVersion: latestVersion.version,
        })
        return
      }

      setUpdateState({ status: 'idle' })
    } catch {
      setUpdateState((current) => ({
        status: current.latestBuildId ? 'error' : 'idle',
        latestBuildId: current.latestBuildId,
        latestVersion: current.latestVersion,
        message: current.latestBuildId
          ? 'The required update could not be verified. Check your connection and retry.'
          : 'Connect to the internet to verify the required app version before continuing.',
      }))
    }
  }, [])

  const updateApp = useCallback(async () => {
    if (!IS_PRODUCTION || typeof window === 'undefined') {
      return
    }

    if (!updateState.latestBuildId) {
      await checkForRequiredUpdate()
      return
    }

    setUpdateState((current) => ({ ...current, status: 'updating', message: undefined }))

    try {
      if (!('serviceWorker' in navigator)) {
        window.location.reload()
        return
      }

      const nextRegistration = await navigator.serviceWorker.register(
        `/sw.js?v=${encodeURIComponent(updateState.latestBuildId)}`,
        {
          scope: '/',
          updateViaCache: 'none',
        }
      )

      setRegistration(nextRegistration)
      await nextRegistration.update()

      const nextWorker = nextRegistration.waiting ?? await waitForWaitingWorker(nextRegistration)
      isApplyingUpdateRef.current = true

      if (nextWorker) {
        nextWorker.postMessage({ type: 'SKIP_WAITING' })

        window.setTimeout(() => {
          if (isApplyingUpdateRef.current) {
            window.location.reload()
          }
        }, 8000)
        return
      }

      window.location.reload()
    } catch {
      isApplyingUpdateRef.current = false
      setUpdateState((current) => ({
        status: 'error',
        latestBuildId: current.latestBuildId,
        latestVersion: current.latestVersion,
        message: 'The update could not be downloaded. Check your connection and retry.',
      }))
    }
  }, [checkForRequiredUpdate, updateState.latestBuildId])

  const retryUpdateCheck = useCallback(async () => {
    await checkForRequiredUpdate()
  }, [checkForRequiredUpdate])

  useEffect(() => {
    if (!IS_PRODUCTION) {
      return
    }

    void checkForRequiredUpdate()

    const handleOnline = () => {
      void checkForRequiredUpdate()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkForRequiredUpdate()
      }
    }

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkForRequiredUpdate])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const displayModeQuery = window.matchMedia('(display-mode: standalone)')
    const syncInstalledState = () => {
      setIsInstalled(detectInstalled())
      setHasResolvedDisplayMode(true)
    }

    syncInstalledState()
    displayModeQuery.addEventListener('change', syncInstalledState)

    return () => {
      displayModeQuery.removeEventListener('change', syncInstalledState)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const handleControllerChange = () => {
      if (!isApplyingUpdateRef.current) {
        return
      }

      isApplyingUpdateRef.current = false
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    let isMounted = true
    const isDevelopment = process.env.NODE_ENV !== 'production'

    const registerServiceWorker = async () => {
      try {
        if (isDevelopment) {
          await unregisterServiceWorkers()
          await clearAllPwaCaches()

          if (isMounted) {
            setRegistration(null)
          }

          return
        }

        const nextRegistration = await navigator.serviceWorker.register(
          `/sw.js?v=${encodeURIComponent(APP_BUILD_ID)}`,
          { scope: '/', updateViaCache: 'none' }
        )

        if (isMounted) {
          setRegistration(nextRegistration)
        }
      } catch (error) {
        console.error('Failed to register service worker:', error)
      }
    }

    const cancelIdleRegistration = scheduleIdleTask(() => {
      void registerServiceWorker()
    })

    return () => {
      isMounted = false
      cancelIdleRegistration()
    }
  }, [])

  useEffect(() => {
    if (isLoading || !registration?.active) {
      return
    }

    if (!user?.id) {
      registration.active.postMessage({ type: 'CLEAR_FACULTY_DATA' })
      return
    }

    registration.active.postMessage({
      type: 'SET_ACTIVE_USER',
      userId: user.id,
    })
  }, [isLoading, registration, user?.id])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const syncSubscription = async () => {
      if (isLoading) {
        return
      }

      if (!user) {
        if (isMounted) {
          setIsPushSubscribed(false)
        }
        await clearFacultyOfflineCache()
        return
      }

      if (!registration || !('PushManager' in window) || !('Notification' in window)) {
        return
      }

      try {
        const subscription = await registration.pushManager.getSubscription()

        if (!isMounted) {
          return
        }

        setNotificationPermission(Notification.permission)
        setIsPushSubscribed(Boolean(subscription))

        if (subscription && user.roles.includes('faculty')) {
          await ProfileService.upsertMyPushSubscription({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: bufferToBase64(subscription.getKey('p256dh')),
              auth: bufferToBase64(subscription.getKey('auth')),
            },
            userAgent: navigator.userAgent,
          })
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to sync push subscription:', error)
        }
      }
    }

    const cancelIdleSync = scheduleIdleTask(() => {
      void syncSubscription()
    }, 3000)

    return () => {
      isMounted = false
      cancelIdleSync()
    }
  }, [isLoading, registration, user])

  const value = useMemo<PwaContextType>(() => {
    const isPushSupported =
      typeof window !== 'undefined' &&
      Boolean(vapidPublicKey) &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    return {
      isServiceWorkerReady: Boolean(registration),
      canInstall: Boolean(deferredPrompt) && !isInstalled,
      isInstalled,
      hasResolvedDisplayMode,
      async installApp() {
        if (!deferredPrompt) {
          return 'unavailable'
        }

        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
          setIsInstalled(true)
        }

        setDeferredPrompt(null)
        return outcome
      },
      isUpdateRequired:
        updateState.status === 'required' ||
        updateState.status === 'updating' ||
        (updateState.status === 'error' && Boolean(updateState.latestBuildId)),
      updateStatus: updateState.status,
      latestVersion: updateState.latestVersion ?? null,
      updateApp,
      retryUpdateCheck,
      isPushSupported,
      notificationPermission,
      isPushSubscribed,
      async subscribeToPush() {
        if (!user?.roles.includes('faculty')) {
          throw new Error('Faculty access is required to enable push notifications.')
        }

        if (!isPushSupported || !registration) {
          throw new Error('Push notifications are not supported in this browser.')
        }

        const nextPermission =
          Notification.permission === 'granted'
            ? 'granted'
            : await Notification.requestPermission()

        setNotificationPermission(nextPermission)

        if (nextPermission !== 'granted') {
          throw new Error('Notification permission was not granted.')
        }

        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          })
        }

        await ProfileService.upsertMyPushSubscription({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: bufferToBase64(subscription.getKey('p256dh')),
            auth: bufferToBase64(subscription.getKey('auth')),
          },
          userAgent: navigator.userAgent,
        })

        setIsPushSubscribed(true)
      },
      async unsubscribeFromPush() {
        if (!isPushSupported || !registration) {
          return
        }

        const subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
          setIsPushSubscribed(false)
          return
        }

        await ProfileService.deleteMyPushSubscription(subscription.endpoint)
        await subscription.unsubscribe()
        setIsPushSubscribed(false)
      },
    }
  }, [
    deferredPrompt,
    hasResolvedDisplayMode,
    isInstalled,
    isPushSubscribed,
    notificationPermission,
    registration,
    retryUpdateCheck,
    updateApp,
    updateState.latestBuildId,
    updateState.latestVersion,
    updateState.status,
    user,
    vapidPublicKey,
  ])

  return (
    <PwaContext.Provider value={value}>
      {children}
      <RequiredUpdateGate
        updateState={updateState}
        onRetryCheck={() => void retryUpdateCheck()}
        onUpdate={() => void updateApp()}
      />
    </PwaContext.Provider>
  )
}

export function usePwa() {
  const context = useContext(PwaContext)

  if (!context) {
    throw new Error('usePwa must be used within a PwaProvider')
  }

  return context
}
