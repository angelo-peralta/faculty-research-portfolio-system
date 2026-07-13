import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { uploadFacultyAssetAsAdmin } from '@/lib/server/admin-uploads'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { normalizeEngagementPayload } from '@/lib/engagement-utils'
import { toErrorResponse } from '@/lib/server/http'
import { parseValidatedJsonOrMultipart } from '@/lib/server/request-validation'
import { engagementPayloadSchema } from '@/lib/validation/faculty-content'
import type { EngagementPayload } from '@/lib/types'

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    await requireAdminUser()
    const { id } = await context.params
    const engagements = await FacultyDataService.listMyEngagements(id)

    return NextResponse.json(engagements)
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
    const { payload, file } = await parseValidatedJsonOrMultipart(request, engagementPayloadSchema, 'certificate')

    const normalizedPayload = normalizeEngagementPayload(payload as EngagementPayload)
    const nextPayload = file
      ? {
          ...normalizedPayload,
          certificate_path: await uploadFacultyAssetAsAdmin(id, 'engagement-certificate', file),
        }
      : normalizedPayload
    const engagement = await FacultyDataService.upsertEngagement(id, nextPayload)

    return NextResponse.json(engagement)
  } catch (error) {
    return toErrorResponse(error)
  }
}
