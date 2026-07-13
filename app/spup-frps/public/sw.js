const CACHE_PREFIX = 'frp-'
const SW_VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
const STATIC_CACHE = `${CACHE_PREFIX}static-${SW_VERSION}`
const APP_SHELL_CACHE = `${CACHE_PREFIX}app-shell-${SW_VERSION}`
const FACULTY_PAGE_CACHE_PREFIX = `${CACHE_PREFIX}faculty-pages-${SW_VERSION}`
const FACULTY_API_CACHE_PREFIX = `${CACHE_PREFIX}faculty-api-${SW_VERSION}`
const CURRENT_CACHES = [STATIC_CACHE, APP_SHELL_CACHE]

let activeUserCacheKey = null

const PRECACHE_URLS = [
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
]

const FACULTY_API_PATHS = new Set([
  '/api/me',
  '/api/me/profile',
  '/api/me/completion',
  '/api/me/education',
  '/api/me/publications',
  '/api/me/engagements',
  '/api/me/research',
])

function isDevelopmentHost() {
  return self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'
}

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isFacultyNavigation(url) {
  return url.pathname.startsWith('/faculty')
}

function normalizeCacheKeyPart(value) {
  return typeof value === 'string'
    ? value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
    : ''
}

function getUserScopedCacheName(prefix) {
  return activeUserCacheKey ? `${prefix}-${activeUserCacheKey}` : null
}

function isCurrentCache(key) {
  return (
    CURRENT_CACHES.includes(key) ||
    key.startsWith(`${FACULTY_PAGE_CACHE_PREFIX}-`) ||
    key.startsWith(`${FACULTY_API_CACHE_PREFIX}-`)
  )
}

async function deleteFacultyCachesExcept(userCacheKey) {
  const keys = await caches.keys()

  await Promise.all(
    keys
      .filter((key) => {
        const isFacultyCache =
          key.startsWith(`${FACULTY_PAGE_CACHE_PREFIX}-`) ||
          key.startsWith(`${FACULTY_API_CACHE_PREFIX}-`)

        if (!isFacultyCache) {
          return false
        }

        return userCacheKey ? !key.endsWith(`-${userCacheKey}`) : true
      })
      .map((key) => caches.delete(key))
  )
}

function isStaticAsset(request, url) {
  if (isDevelopmentHost() && url.pathname.startsWith('/_next/')) {
    return false
  }

  return (
    url.pathname.startsWith('/_next/static/') ||
    ['script', 'style', 'font', 'image', 'manifest'].includes(request.destination)
  )
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)

  try {
    const response = await fetch(request)

    if (response.ok) {
      await cache.put(request, response.clone())
    }

    return response
  } catch (error) {
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    throw error
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  const response = await fetch(request)

  if (response.ok) {
    await cache.put(request, response.clone())
  }

  return response
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                !isCurrentCache(key)
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  if (!isSameOrigin(url)) {
    return
  }

  if (request.mode === 'navigate') {
    if (isFacultyNavigation(url)) {
      const cacheName = getUserScopedCacheName(FACULTY_PAGE_CACHE_PREFIX)

      if (cacheName) {
        event.respondWith(networkFirst(request, cacheName))
      }
    }

    return
  }

  if (FACULTY_API_PATHS.has(url.pathname)) {
    const cacheName = getUserScopedCacheName(FACULTY_API_CACHE_PREFIX)

    if (cacheName) {
      event.respondWith(networkFirst(request, cacheName))
    }

    return
  }

  if (isStaticAsset(request, url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
  }
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }

  if (event.data?.type === 'SET_ACTIVE_USER') {
    const nextUserCacheKey = normalizeCacheKeyPart(event.data.userId)

    if (!nextUserCacheKey) {
      return
    }

    if (activeUserCacheKey !== nextUserCacheKey) {
      activeUserCacheKey = nextUserCacheKey
      event.waitUntil(deleteFacultyCachesExcept(nextUserCacheKey))
    }

    return
  }

  if (event.data?.type === 'CLEAR_FACULTY_DATA') {
    activeUserCacheKey = null
    event.waitUntil(deleteFacultyCachesExcept(null))
  }
})

self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {}
  const title = payload.title || 'Faculty Research Portfolio'
  const options = {
    body: payload.body || 'A new update is available.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag || undefined,
    data: {
      url: payload.url || '/faculty/profile',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/faculty/profile'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }

      return undefined
    })
  )
})
