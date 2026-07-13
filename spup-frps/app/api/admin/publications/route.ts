import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { AdminDataService } from '@/lib/server/admin-data'
import { toErrorResponse } from '@/lib/server/http'
import { getRequestId, logRouteError, logRouteSuccess } from '@/lib/server/route-logging'
import { adminPublicationListQuerySchema } from '@/lib/validation/faculty-content'

export async function GET(request: Request) {
  const start = Date.now()
  const requestId = getRequestId(request)

  try {
    const authStart = Date.now()
    await requireAdminUser()
    const authMs = Date.now() - authStart
    const { searchParams } = new URL(request.url)
    const query = adminPublicationListQuerySchema.parse({
      search: searchParams.get('search') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      year: searchParams.get('year') ?? undefined,
      indexing: searchParams.get('indexing') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      page_size: searchParams.get('page_size') ?? undefined,
    })
    const dataStart = Date.now()
    const publications = await AdminDataService.getPublicationListPage(query)

    logRouteSuccess({
      msg: 'admin_publications_done',
      route: '/api/admin/publications',
      requestId,
      auth_ms: authMs,
      data_ms: Date.now() - dataStart,
      cache_state: 'dynamic',
      result_count: publications.items.length,
      ms: Date.now() - start,
    })

    return NextResponse.json(publications)
  } catch (error) {
    logRouteError({
      msg: 'admin_publications_failed',
      route: '/api/admin/publications',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    })

    return toErrorResponse(error)
  }
}
