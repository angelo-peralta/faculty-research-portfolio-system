import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { getCachedAdminDepartmentsSummary } from '@/lib/server/admin-cache'
import { toErrorResponse } from '@/lib/server/http'

export async function GET() {
  try {
    await requireAdminUser()
    const departments = await getCachedAdminDepartmentsSummary()

    return NextResponse.json(departments)
  } catch (error) {
    return toErrorResponse(error)
  }
}
