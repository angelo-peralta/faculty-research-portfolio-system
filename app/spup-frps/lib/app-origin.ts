const DEFAULT_PRODUCTION_APP_ORIGIN = 'https://frp-v3.vercel.app'

function hasMatchingQuotes(value: string) {
  return (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  )
}

export function normalizeEnvValue(value: string | null | undefined) {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  const unquoted = hasMatchingQuotes(trimmed) ? trimmed.slice(1, -1).trim() : trimmed
  return unquoted || null
}

function isPrivateIpv4(hostname: string) {
  if (hostname.startsWith('10.')) {
    return true
  }

  if (hostname.startsWith('192.168.')) {
    return true
  }

  const match = hostname.match(/^172\.(\d{1,2})\./)
  if (!match) {
    return false
  }

  const secondOctet = Number(match[1])
  return secondOctet >= 16 && secondOctet <= 31
}

function isLocalDevelopmentOrigin(origin: string | null | undefined) {
  if (!origin) {
    return false
  }

  try {
    const { hostname } = new URL(origin)

    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.local') ||
      isPrivateIpv4(hostname)
    )
  } catch {
    return false
  }
}

export function getConfiguredAppOrigin() {
  return (
    normalizeEnvValue(process.env.NEXT_PUBLIC_APP_ORIGIN) ??
    normalizeEnvValue(process.env.NEXT_PUBLIC_SITE_URL) ??
    DEFAULT_PRODUCTION_APP_ORIGIN
  )
}

export function getServerAppOrigin(requestOrigin?: string | null) {
  if (process.env.NODE_ENV !== 'production' && isLocalDevelopmentOrigin(requestOrigin)) {
    return requestOrigin!
  }

  return getConfiguredAppOrigin()
}

export function getBrowserAppOrigin() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    const currentOrigin = window.location.origin

    if (isLocalDevelopmentOrigin(currentOrigin)) {
      return currentOrigin
    }
  }

  return getConfiguredAppOrigin()
}

export function buildAppUrl(
  pathname: string,
  options?: {
    origin?: string
    searchParams?: URLSearchParams | Record<string, string | string[] | undefined>
  }
) {
  const url = new URL(pathname, options?.origin ?? getConfiguredAppOrigin())

  if (options?.searchParams instanceof URLSearchParams) {
    url.search = options.searchParams.toString()
    return url
  }

  if (options?.searchParams) {
    const search = new URLSearchParams()

    for (const [key, value] of Object.entries(options.searchParams)) {
      if (Array.isArray(value)) {
        value.forEach((entry) => search.append(key, entry))
        continue
      }

      if (typeof value === 'string') {
        search.set(key, value)
      }
    }

    url.search = search.toString()
  }

  return url
}
