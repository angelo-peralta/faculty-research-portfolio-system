import { NextResponse, type NextRequest } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toErrorResponse } from '@/lib/server/http'
import { NotificationService } from '@/lib/server/notifications'
import { uploadFacultyAssetAsAdmin } from '@/lib/server/admin-uploads'
import { getRequestId, logRouteError, logRouteSuccess } from '@/lib/server/route-logging'
import { parseValidatedJsonOrMultipart } from '@/lib/server/request-validation'
import { publicationPayloadSchema } from '@/lib/validation/faculty-content'
import type { PublicationPayload } from '@/lib/types'

function withNormalizedAuthors(payload: PublicationPayload | Omit<PublicationPayload, 'authors'> & { authors?: string[] }): PublicationPayload {
  return {
    ...payload,
    authors: payload.authors ?? [],
  }
}

export async function GET(request: Request) {
  const start = Date.now()
  const requestId = getRequestId(request)

  try {
    const authStart = Date.now()
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const authMs = Date.now() - authStart
    const dataStart = Date.now()
    const publications = await FacultyDataService.listMyPublications(user.id)

    logRouteSuccess({
      msg: 'faculty_publications_done',
      route: '/api/me/publications',
      requestId,
      auth_ms: authMs,
      data_ms: Date.now() - dataStart,
      cache_state: 'dynamic',
      result_count: publications.length,
      ms: Date.now() - start,
    })

    return NextResponse.json(publications)
  } catch (error) {
    logRouteError({
      msg: 'faculty_publications_failed',
      route: '/api/me/publications',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    })

    return toErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const { payload, file } = await parseValidatedJsonOrMultipart(request, publicationPayloadSchema, 'proof')
    const normalizedPayload = withNormalizedAuthors(payload as PublicationPayload)
    const nextPayload =
      file
        ? {
            ...normalizedPayload,
            proof_path: await uploadFacultyAssetAsAdmin(user.id, 'publication-proof', file),
          }
        : normalizedPayload
    const publication = await FacultyDataService.upsertPublication(user.id, nextPayload)
    await NotificationService.createAdminOperationalNotification({
      kind: 'publication_added',
      title: 'New publication added',
      message: `${user.name} added "${publication.title}".`,
      actorUserId: user.id,
      relatedUserId: user.id,
      href: `/admin/faculty/${user.id}`,
    })

    return NextResponse.json(publication)
  } catch (error) {
    return toErrorResponse(error)
  }
}
