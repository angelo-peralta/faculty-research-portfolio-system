import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { AdminDataService } from '@/lib/server/admin-data'
import { toErrorResponse } from '@/lib/server/http'
import { parseValidatedJson } from '@/lib/server/request-validation'
import { facultyInvitePayloadSchema } from '@/lib/validation/faculty-content'

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const { user } = await requireAdminUser({ mainAdminOnly: true })
    const { id } = await context.params
    const payload = await parseValidatedJson(request, facultyInvitePayloadSchema)
    const invite = await AdminDataService.updateInvite(id, user.id, payload)

    return NextResponse.json(invite)
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
    await requireAdminUser({ mainAdminOnly: true })
    const { id } = await context.params
    const deleted = await AdminDataService.cancelInvite(id)

    if (!deleted) {
      return NextResponse.json({ error: 'Pending invite not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
