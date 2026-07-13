import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { AdminDataService } from '@/lib/server/admin-data'
import { toErrorResponse } from '@/lib/server/http'
import { getRequestId, logRouteError, logRouteSuccess } from '@/lib/server/route-logging'
import { adminDepartmentDetailQuerySchema } from '@/lib/validation/faculty-content'
import { DEPARTMENTS } from '@/lib/constants'
import type { Department } from '@/lib/types'

export async function GET(
  request: Request,
  context: {
    params: Promise<{ department: string }>
  }
) {
  const start = Date.now()
  const requestId = getRequestId(request)

  try {
    const authStart = Date.now()
    await requireAdminUser()
    const authMs = Date.now() - authStart

    const { department } = await context.params
    const departmentCode = department as Department

    if (!DEPARTMENTS.some((item) => item.value === departmentCode)) {
      return NextResponse.json({ error: 'Department not found.' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const query = adminDepartmentDetailQuerySchema.parse({
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      page_size: searchParams.get('page_size') ?? undefined,
    })

    const dataStart = Date.now()
    const detail = await AdminDataService.getDepartmentDetail({
      department: departmentCode,
      ...query,
    })

    logRouteSuccess({
      msg: 'admin_department_detail_done',
      route: '/api/admin/departments/[department]',
      requestId,
      department: departmentCode,
      auth_ms: authMs,
      data_ms: Date.now() - dataStart,
      cache_state: 'dynamic',
      result_count: detail.roster.items.length,
      ms: Date.now() - start,
    })

    return NextResponse.json(detail)
  } catch (error) {
    logRouteError({
      msg: 'admin_department_detail_failed',
      route: '/api/admin/departments/[department]',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    })

    return toErrorResponse(error)
  }
}
