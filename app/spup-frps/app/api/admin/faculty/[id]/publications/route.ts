import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
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

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    await requireAdminUser()
    const { id } = await context.params
    const publications = await FacultyDataService.listMyPublications(id)

    return NextResponse.json(publications)
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
    const { payload, file } = await parseValidatedJsonOrMultipart(request, publicationPayloadSchema, 'proof')
    const normalizedPayload = withNormalizedAuthors(payload as PublicationPayload)
    const nextPayload =
      file
        ? {
            ...normalizedPayload,
            proof_path: await uploadFacultyAssetAsAdmin(id, 'publication-proof', file),
          }
        : normalizedPayload
    const publication = await FacultyDataService.upsertPublication(id, nextPayload)

    return NextResponse.json(publication)
  } catch (error) {
    return toErrorResponse(error)
  }
}
