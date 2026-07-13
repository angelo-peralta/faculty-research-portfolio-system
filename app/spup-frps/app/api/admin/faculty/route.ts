import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { AdminDataService } from '@/lib/server/admin-data'
import { toErrorResponse } from '@/lib/server/http'
import { getRequestId, logRouteError, logRouteSuccess } from '@/lib/server/route-logging'
import { parseValidatedJson } from '@/lib/server/request-validation'
import {
  adminFacultyListQuerySchema,
  facultyInvitePayloadSchema,
} from '@/lib/validation/faculty-content'

export async function GET(request: Request) {
  const start = Date.now()
  const requestId = getRequestId(request)

  try {
    const authStart = Date.now()
    await requireAdminUser()
    const authMs = Date.now() - authStart
    const { searchParams } = new URL(request.url)
    const query = adminFacultyListQuerySchema.parse({
      search: searchParams.get('search') ?? undefined,
      department: searchParams.get('department') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      page_size: searchParams.get('page_size') ?? undefined,
    })
    const dataStart = Date.now()
    const faculty = await AdminDataService.getFacultyListPage(query)

    logRouteSuccess({
      msg: 'admin_faculty_list_done',
      route: '/api/admin/faculty',
      requestId,
      auth_ms: authMs,
      data_ms: Date.now() - dataStart,
      cache_state: 'dynamic',
      result_count: faculty.items.length,
      ms: Date.now() - start,
    })

    return NextResponse.json(faculty)
  } catch (error) {
    logRouteError({
      msg: 'admin_faculty_list_failed',
      route: '/api/admin/faculty',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    })

    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAdminUser({ mainAdminOnly: true })
    const payload = await parseValidatedJson(request, facultyInvitePayloadSchema)
    const invite = await AdminDataService.createFacultyInvite(user.id, payload)

    return NextResponse.json(invite, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
