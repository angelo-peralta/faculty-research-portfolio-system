import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { AdminDataService } from '@/lib/server/admin-data'
import { toErrorResponse } from '@/lib/server/http'
import { parseValidatedJson } from '@/lib/server/request-validation'
import { adminUserCreatePayloadSchema } from '@/lib/validation/faculty-content'

export async function GET() {
  try {
    await requireAdminUser()
    const adminUsers = await AdminDataService.listAdminUsers()

    return NextResponse.json(adminUsers)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAdminUser({ mainAdminOnly: true })
    const payload = await parseValidatedJson(request, adminUserCreatePayloadSchema)
    const adminUser = await AdminDataService.upsertAdminUser({
      createdByUserId: user.id,
      email: payload.email,
      role: payload.role,
      includeFaculty: payload.includeFaculty,
    })

    return NextResponse.json(adminUser, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
