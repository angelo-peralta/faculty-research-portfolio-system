import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { AdminDataService } from '@/lib/server/admin-data'
import { toErrorResponse } from '@/lib/server/http'
import { getRequestId, logRouteError, logRouteSuccess } from '@/lib/server/route-logging'
import { adminResearchListQuerySchema } from '@/lib/validation/faculty-content'

export async function GET(request: Request) {
  const start = Date.now()
  const requestId = getRequestId(request)

  try {
    const authStart = Date.now()
    await requireAdminUser()
    const authMs = Date.now() - authStart
    const { searchParams } = new URL(request.url)
    const query = adminResearchListQuerySchema.parse({
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      page_size: searchParams.get('page_size') ?? undefined,
    })
    const dataStart = Date.now()
    const researchTitles = await AdminDataService.getResearchListPage(query)

    logRouteSuccess({
      msg: 'admin_research_done',
      route: '/api/admin/research',
      requestId,
      auth_ms: authMs,
      data_ms: Date.now() - dataStart,
      cache_state: 'dynamic',
      result_count: researchTitles.items.length,
      ms: Date.now() - start,
    })

    return NextResponse.json(researchTitles)
  } catch (error) {
    logRouteError({
      msg: 'admin_research_failed',
      route: '/api/admin/research',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    })

    return toErrorResponse(error)
  }
}
