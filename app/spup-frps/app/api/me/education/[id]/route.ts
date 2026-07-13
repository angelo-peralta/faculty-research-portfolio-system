import { NextResponse, type NextRequest } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toErrorResponse } from '@/lib/server/http'
import { parseValidatedJson } from '@/lib/server/request-validation'
import { educationPayloadSchema } from '@/lib/validation/faculty-content'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const payload = await parseValidatedJson(request, educationPayloadSchema)
    const entry = await FacultyDataService.upsertEducation(user.id, { ...payload, id })

    return NextResponse.json(entry)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const success = await FacultyDataService.deleteEducation(user.id, id)

    return NextResponse.json({ success })
  } catch (error) {
    return toErrorResponse(error)
  }
}
