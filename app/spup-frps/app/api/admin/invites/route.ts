import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { AdminDataService } from '@/lib/server/admin-data'
import { toErrorResponse } from '@/lib/server/http'
import { parseValidatedJson } from '@/lib/server/request-validation'
import { facultyInvitePayloadSchema } from '@/lib/validation/faculty-content'

export async function GET() {
  try {
    await requireAdminUser()
    const invites = await AdminDataService.listInvites()

    return NextResponse.json(invites)
  } catch (error) {
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
