import { NextResponse, type NextRequest } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { uploadFacultyAssetAsAdmin } from '@/lib/server/admin-uploads'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toErrorResponse } from '@/lib/server/http'
import { parseValidatedJsonOrMultipart } from '@/lib/server/request-validation'
import { researchTitlePayloadSchema } from '@/lib/validation/faculty-content'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const { payload, file } = await parseValidatedJsonOrMultipart(request, researchTitlePayloadSchema, 'paper')
    const researchTitle = await FacultyDataService.upsertResearchTitle(user.id, {
      ...payload,
      id,
      ...(file
        ? {
            paper_path: await uploadFacultyAssetAsAdmin(user.id, 'research-paper', file),
          }
        : {}),
    })

    return NextResponse.json(researchTitle)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const success = await FacultyDataService.deleteResearchTitle(user.id, id)

    return NextResponse.json({ success })
  } catch (error) {
    return toErrorResponse(error)
  }
}
