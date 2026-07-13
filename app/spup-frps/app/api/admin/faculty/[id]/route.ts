import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { AdminDataService } from '@/lib/server/admin-data'
import { toErrorResponse } from '@/lib/server/http'
import {
  accessStatusPatchSchema,
  adminProfilePatchSchema,
} from '@/lib/validation/faculty-content'

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    await requireAdminUser()
    const { id } = await context.params
    const detail = await AdminDataService.getProfilePreview(id)

    if (!detail) {
      return NextResponse.json({ error: 'Faculty user not found.' }, { status: 404 })
    }

    return NextResponse.json(detail)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const rawPayload = await request.json()
    const { id } = await context.params

    if (
      typeof rawPayload === 'object' &&
      rawPayload !== null &&
      'access_status' in rawPayload
    ) {
      const payload = accessStatusPatchSchema.parse(rawPayload)
      const { user } = await requireAdminUser({ mainAdminOnly: true })
      const updatedUser = await AdminDataService.setFacultyAccessStatus(user.id, id, payload.access_status)
      return NextResponse.json(updatedUser)
    }

    await requireAdminUser()
    const payload = adminProfilePatchSchema.parse(rawPayload)
    const profile = await AdminDataService.updateFacultyProfile(id, payload)
    return NextResponse.json(profile)
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
    const updatedUser = await AdminDataService.setFacultyAccessStatus(user.id, id, 'inactive')

    return NextResponse.json(updatedUser)
  } catch (error) {
    return toErrorResponse(error)
  }
}
