import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { AdminDataService } from '@/lib/server/admin-data'
import { toErrorResponse } from '@/lib/server/http'
import { parseValidatedJson } from '@/lib/server/request-validation'
import { adminUserUpdatePayloadSchema } from '@/lib/validation/faculty-content'

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const { user } = await requireAdminUser({ mainAdminOnly: true })
    const { id } = await context.params
    const payload = await parseValidatedJson(request, adminUserUpdatePayloadSchema)
    const adminUser = await AdminDataService.updateAdminRole({
      actorUserId: user.id,
      userId: id,
      role: payload.role,
      includeFaculty: payload.includeFaculty,
    })

    return NextResponse.json(adminUser)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const { user } = await requireAdminUser({ mainAdminOnly: true })
    const { id } = await context.params
    const updatedUser = await AdminDataService.revokeAdminRoles(user.id, id)

    return NextResponse.json(updatedUser)
  } catch (error) {
    return toErrorResponse(error)
  }
}
