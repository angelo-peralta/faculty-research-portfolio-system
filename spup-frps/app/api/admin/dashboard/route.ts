import { NextRequest, NextResponse } from 'next/server'
import { DEPARTMENTS } from '@/lib/constants'
import { requireAdminUser } from '@/lib/server/auth'
import { getCachedAdminDashboardData } from '@/lib/server/admin-cache'
import { toErrorResponse } from '@/lib/server/http'
import type { Department } from '@/lib/types'

export async function GET(request: NextRequest) {
  const start = Date.now()
  const requestId = request.headers.get('x-vercel-id')

  try {
    const authStart = Date.now()
    await requireAdminUser()
    const authMs = Date.now() - authStart
    const requestedDepartment = request.nextUrl.searchParams.get('department')
    const department = DEPARTMENTS.some((item) => item.value === requestedDepartment)
      ? (requestedDepartment as Department)
      : undefined
    const dataStart = Date.now()
    const dashboard = await getCachedAdminDashboardData(department)

    console.log(JSON.stringify({
      level: 'info',
      msg: 'admin_dashboard_done',
      route: '/api/admin/dashboard',
      requestId,
      region: process.env.VERCEL_REGION ?? 'local',
      department: department ?? 'all',
      auth_ms: authMs,
      data_ms: Date.now() - dataStart,
      cache: 'next-cache-revalidate-300',
      ms: Date.now() - start,
    }))

    return NextResponse.json(dashboard)
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'admin_dashboard_failed',
      route: '/api/admin/dashboard',
      requestId,
      region: process.env.VERCEL_REGION ?? 'local',
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    }))

    return toErrorResponse(error)
  }
}
