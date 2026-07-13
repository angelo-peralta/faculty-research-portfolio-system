import { NextResponse, type NextRequest } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { uploadFacultyAssetAsAdmin } from '@/lib/server/admin-uploads'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toErrorResponse } from '@/lib/server/http'
import { parseValidatedJsonOrMultipart } from '@/lib/server/request-validation'
import { publicationPayloadSchema } from '@/lib/validation/faculty-content'
import type { PublicationPayload } from '@/lib/types'

function withNormalizedAuthors(payload: PublicationPayload | Omit<PublicationPayload, 'authors'> & { authors?: string[] }): PublicationPayload {
  return {
    ...payload,
    authors: payload.authors ?? [],
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const { payload, file } = await parseValidatedJsonOrMultipart(request, publicationPayloadSchema, 'proof')
    const normalizedPayload = withNormalizedAuthors(payload as PublicationPayload)
    const nextPayload = {
      ...normalizedPayload,
      id,
      ...(file
        ? {
            proof_path: await uploadFacultyAssetAsAdmin(user.id, 'publication-proof', file),
          }
        : {}),
    }
    const publication = await FacultyDataService.upsertPublication(user.id, nextPayload)

    return NextResponse.json(publication)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const success = await FacultyDataService.deletePublication(user.id, id)

    return NextResponse.json({ success })
  } catch (error) {
    return toErrorResponse(error)
  }
}
