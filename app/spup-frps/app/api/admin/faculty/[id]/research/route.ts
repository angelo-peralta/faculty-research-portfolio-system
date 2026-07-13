import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { uploadFacultyAssetAsAdmin } from '@/lib/server/admin-uploads'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toErrorResponse } from '@/lib/server/http'
import { parseValidatedJsonOrMultipart } from '@/lib/server/request-validation'
import { researchTitlePayloadSchema } from '@/lib/validation/faculty-content'

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    await requireAdminUser()
    const { id } = await context.params
    const researchTitles = await FacultyDataService.listMyResearchTitles(id)

    return NextResponse.json(researchTitles)
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
    const { payload, file } = await parseValidatedJsonOrMultipart(request, researchTitlePayloadSchema, 'paper')
    const nextPayload =
      file
        ? {
            ...payload,
            paper_path: await uploadFacultyAssetAsAdmin(id, 'research-paper', file),
          }
        : payload
    const researchTitle = await FacultyDataService.upsertResearchTitle(id, nextPayload)

    return NextResponse.json(researchTitle)
  } catch (error) {
    return toErrorResponse(error)
  }
}
