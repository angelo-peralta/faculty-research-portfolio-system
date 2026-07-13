import { NextResponse, type NextRequest } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { uploadFacultyAssetAsAdmin } from '@/lib/server/admin-uploads'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toErrorResponse } from '@/lib/server/http'
import { NotificationService } from '@/lib/server/notifications'
import { getRequestId, logRouteError, logRouteSuccess } from '@/lib/server/route-logging'
import { parseValidatedJsonOrMultipart } from '@/lib/server/request-validation'
import { researchTitlePayloadSchema } from '@/lib/validation/faculty-content'

export async function GET(request: Request) {
  const start = Date.now()
  const requestId = getRequestId(request)

  try {
    const authStart = Date.now()
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const authMs = Date.now() - authStart
    const dataStart = Date.now()
    const researchTitles = await FacultyDataService.listMyResearchTitles(user.id)

    logRouteSuccess({
      msg: 'faculty_research_done',
      route: '/api/me/research',
      requestId,
      auth_ms: authMs,
      data_ms: Date.now() - dataStart,
      cache_state: 'dynamic',
      result_count: researchTitles.length,
      ms: Date.now() - start,
    })

    return NextResponse.json(researchTitles)
  } catch (error) {
    logRouteError({
      msg: 'faculty_research_failed',
      route: '/api/me/research',
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
    const { payload, file } = await parseValidatedJsonOrMultipart(request, researchTitlePayloadSchema, 'paper')
    const nextPayload = file
      ? {
          ...payload,
          paper_path: await uploadFacultyAssetAsAdmin(user.id, 'research-paper', file),
        }
      : payload
    const researchTitle = await FacultyDataService.upsertResearchTitle(user.id, nextPayload)
    await NotificationService.createAdminOperationalNotification({
      kind: 'research_added',
      title: 'New research title added',
      message: `${user.name} added "${researchTitle.title}".`,
      actorUserId: user.id,
      relatedUserId: user.id,
      href: `/admin/faculty/${user.id}`,
    })

    return NextResponse.json(researchTitle)
  } catch (error) {
    return toErrorResponse(error)
  }
}
