import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toErrorResponse } from '@/lib/server/http'
import { parseValidatedJson } from '@/lib/server/request-validation'
import { educationPayloadSchema } from '@/lib/validation/faculty-content'

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    await requireAdminUser()
    const { id } = await context.params
    const education = await FacultyDataService.listMyEducation(id)

    return NextResponse.json(education)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    await requireAdminUser()
    const { id } = await context.params
    const payload = await parseValidatedJson(request, educationPayloadSchema)
    const education = await FacultyDataService.upsertEducation(id, payload)

    return NextResponse.json(education)
  } catch (error) {
    return toErrorResponse(error)
  }
}
