import { NextResponse } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { toErrorResponse } from '@/lib/server/http'
import { checkRateLimit, getClientRateLimitKey, rateLimitHeaders } from '@/lib/server/rate-limit'

const SESSION_CHECK_RATE_LIMIT = {
  max: 30,
  windowMs: 60 * 1000,
}

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
}

export async function GET(request: Request) {
  const rateLimit = await checkRateLimit(
    getClientRateLimitKey(request, 'api:me'),
    SESSION_CHECK_RATE_LIMIT
  )

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many session checks. Please retry shortly.' },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders(rateLimit),
          ...NO_STORE_HEADERS,
        },
      }
    )
  }

  try {
    const { user } = await requireAppUser()

    return NextResponse.json(
      {
        user,
      },
      {
        headers: {
          ...rateLimitHeaders(rateLimit),
          ...NO_STORE_HEADERS,
        },
      }
    )
  } catch (error) {
    const response = toErrorResponse(error)
    response.headers.set('Cache-Control', NO_STORE_HEADERS['Cache-Control'])
    return response
  }
}
