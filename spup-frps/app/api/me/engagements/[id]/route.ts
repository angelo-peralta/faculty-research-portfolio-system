import { NextResponse, type NextRequest } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { uploadFacultyAssetAsAdmin } from '@/lib/server/admin-uploads'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { normalizeEngagementPayload } from '@/lib/engagement-utils'
import { toErrorResponse } from '@/lib/server/http'
import { parseValidatedJsonOrMultipart } from '@/lib/server/request-validation'
import { engagementPayloadSchema } from '@/lib/validation/faculty-content'
import type { EngagementPayload } from '@/lib/types'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const { payload, file } = await parseValidatedJsonOrMultipart(request, engagementPayloadSchema, 'certificate')

    const normalizedPayload = normalizeEngagementPayload(payload as EngagementPayload)
    const nextPayload = {
      ...normalizedPayload,
      id,
      ...(file
        ? {
            certificate_path: await uploadFacultyAssetAsAdmin(user.id, 'engagement-certificate', file),
          }
        : {}),
    }
    const engagement = await FacultyDataService.upsertEngagement(user.id, nextPayload)

    return NextResponse.json(engagement)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const success = await FacultyDataService.deleteEngagement(user.id, id)

    return NextResponse.json({ success })
  } catch (error) {
    return toErrorResponse(error)
  }
}
