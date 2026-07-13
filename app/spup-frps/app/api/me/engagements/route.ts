import { NextResponse, type NextRequest } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { uploadFacultyAssetAsAdmin } from '@/lib/server/admin-uploads'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { normalizeEngagementPayload } from '@/lib/engagement-utils'
import { toErrorResponse } from '@/lib/server/http'
import { NotificationService } from '@/lib/server/notifications'
import { getRequestId, logRouteError, logRouteSuccess } from '@/lib/server/route-logging'
import { parseValidatedJsonOrMultipart } from '@/lib/server/request-validation'
import { engagementPayloadSchema } from '@/lib/validation/faculty-content'
import type { EngagementPayload } from '@/lib/types'

export async function GET(request: Request) {
  const start = Date.now()
  const requestId = getRequestId(request)

  try {
    const authStart = Date.now()
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const authMs = Date.now() - authStart
    const dataStart = Date.now()
    const engagements = await FacultyDataService.listMyEngagements(user.id)

    logRouteSuccess({
      msg: 'faculty_engagements_done',
      route: '/api/me/engagements',
      requestId,
      auth_ms: authMs,
      data_ms: Date.now() - dataStart,
      cache_state: 'dynamic',
      result_count: engagements.length,
      ms: Date.now() - start,
    })

    return NextResponse.json(engagements)
  } catch (error) {
    logRouteError({
      msg: 'faculty_engagements_failed',
      route: '/api/me/engagements',
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
    const { payload, file } = await parseValidatedJsonOrMultipart(request, engagementPayloadSchema, 'certificate')

    const normalizedPayload = normalizeEngagementPayload(payload as EngagementPayload)
    const nextPayload = file
      ? {
          ...normalizedPayload,
          certificate_path: await uploadFacultyAssetAsAdmin(user.id, 'engagement-certificate', file),
        }
      : normalizedPayload
    const engagement = await FacultyDataService.upsertEngagement(user.id, nextPayload)
    await NotificationService.createAdminOperationalNotification({
      kind: 'engagement_added',
      title: 'New engagement added',
      message: `${user.name} added "${engagement.title}".`,
      actorUserId: user.id,
      relatedUserId: user.id,
      href: `/admin/faculty/${user.id}`,
    })

    return NextResponse.json(engagement)
  } catch (error) {
    return toErrorResponse(error)
  }
}
