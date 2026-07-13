type RateLimitOptions = {
  max: number
  windowMs: number
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfter: number
}

const buckets = new Map<string, RateLimitBucket>()
const MAX_BUCKETS = 10000
const UPSTASH_RETRY_DELAY_MS = 30_000

let upstashUnavailableUntil = 0

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/+$/, '')
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()

  return url && token ? { url, token } : null
}

function shouldUseUpstash(now: number) {
  return Boolean(getUpstashConfig()) && now >= upstashUnavailableUntil
}

async function runUpstashPipeline(commands: unknown[][]) {
  const config = getUpstashConfig()

  if (!config) {
    return null
  }

  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Rate limit store failed: ${response.status}`)
  }

  const payload = (await response.json()) as Array<{
    result?: unknown
    error?: string
  }>

  for (const item of payload) {
    if (item.error) {
      throw new Error(`Rate limit store failed: ${item.error}`)
    }
  }

  return payload.map((item) => item.result)
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }
  }

  if (buckets.size <= MAX_BUCKETS) {
    return
  }

  const overflow = buckets.size - MAX_BUCKETS
  let deleted = 0

  for (const key of buckets.keys()) {
    buckets.delete(key)
    deleted += 1

    if (deleted >= overflow) {
      break
    }
  }
}

function checkLocalRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  pruneExpiredBuckets(now)

  const existing = buckets.get(key)
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + options.windowMs,
        }

  if (bucket.count >= options.max) {
    buckets.set(key, bucket)

    return {
      allowed: false,
      limit: options.max,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  bucket.count += 1
  buckets.set(key, bucket)

  return {
    allowed: true,
    limit: options.max,
    remaining: Math.max(0, options.max - bucket.count),
    resetAt: bucket.resetAt,
    retryAfter: 0,
  }
}

async function checkUpstashRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult | null> {
  const now = Date.now()

  if (!shouldUseUpstash(now)) {
    return null
  }

  try {
    const results = await runUpstashPipeline([
      ['INCR', key],
      ['PTTL', key],
    ])

    if (!results) {
      return null
    }

    const count = Number(results[0])
    let ttlMs = Number(results[1])

    if (!Number.isFinite(count)) {
      return null
    }

    if (!Number.isFinite(ttlMs) || ttlMs < 0 || count === 1) {
      await runUpstashPipeline([['PEXPIRE', key, options.windowMs]])
      ttlMs = options.windowMs
    }

    const resetAt = now + ttlMs
    const remaining = Math.max(0, options.max - count)
    const retryAfter = count > options.max ? Math.max(1, Math.ceil(ttlMs / 1000)) : 0

    return {
      allowed: count <= options.max,
      limit: options.max,
      remaining,
      resetAt,
      retryAfter,
    }
  } catch (error) {
    upstashUnavailableUntil = now + UPSTASH_RETRY_DELAY_MS
    console.error('Falling back to local rate limit store:', error)
    return null
  }
}

export async function checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const upstashResult = await checkUpstashRateLimit(key, options)
  return upstashResult ?? checkLocalRateLimit(key, options)
}

export function getClientRateLimitKey(request: Request, namespace: string) {
  const connectingIp = request.headers.get('cf-connecting-ip')?.trim()
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  const clientIp = connectingIp || forwardedFor || realIp || 'local'
  const normalizedClientIp = clientIp.replace(/[^a-zA-Z0-9:._-]/g, '_').slice(0, 100)

  return `${namespace}:${normalizedClientIp}`
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.retryAfter > 0 ? { 'Retry-After': String(result.retryAfter) } : {}),
  }
}
