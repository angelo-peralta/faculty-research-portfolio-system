import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { getCachedDecisionSupportPageData } from '@/lib/server/admin-cache'
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
    const data = await getCachedDecisionSupportPageData()

    logRouteSuccess({
      msg: 'admin_decision_support_done',
      route: '/api/admin/decision-support',
      requestId,
      auth_ms: authMs,
      data_ms: Date.now() - dataStart,
      cache_state: 'next-cache-revalidate-300',
      result_count: data.faculty.length,
      ms: Date.now() - start,
    })

    return NextResponse.json(data)
  } catch (error) {
    logRouteError({
      msg: 'admin_decision_support_failed',
      route: '/api/admin/decision-support',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    })

    return toErrorResponse(error)
  }
}
