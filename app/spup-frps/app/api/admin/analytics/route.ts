import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { getCachedAdminAnalyticsSummary } from '@/lib/server/admin-cache'
import { toErrorResponse } from '@/lib/server/http'
import { getRequestId, logRouteError, logRouteSuccess } from '@/lib/server/route-logging'

export async function GET(request: Request) {
  const start = Date.now()
  const requestId = getRequestId(request)

  try {
    const authStart = Date.now()
    await requireAdminUser()
    const authMs = Date.now() - authStart
    const dataStart = Date.now()
    const analytics = await getCachedAdminAnalyticsSummary()

    logRouteSuccess({
      msg: 'admin_analytics_done',
      route: '/api/admin/analytics',
      requestId,
      auth_ms: authMs,
      data_ms: Date.now() - dataStart,
      cache_state: 'next-cache-revalidate-300',
      result_count: analytics.departmentPerformance.length,
      ms: Date.now() - start,
    })

    return NextResponse.json(analytics)
  } catch (error) {
    logRouteError({
      msg: 'admin_analytics_failed',
      route: '/api/admin/analytics',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    })

    return toErrorResponse(error)
  }
}
