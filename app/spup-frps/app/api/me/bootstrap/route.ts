import { NextResponse } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toErrorResponse } from '@/lib/server/http'
import { getRequestId, logRouteError, logRouteSuccess } from '@/lib/server/route-logging'

export async function GET(request: Request) {
  const start = Date.now()
  const requestId = getRequestId(request)

  try {
    const authStart = Date.now()
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const authMs = Date.now() - authStart
    const dataStart = Date.now()
    const [profile, education, publications, engagements, researchTitles] = await Promise.all([
      FacultyDataService.getMyProfile(user),
      FacultyDataService.listMyEducation(user.id),
      FacultyDataService.listMyPublications(user.id),
      FacultyDataService.listMyEngagements(user.id),
      FacultyDataService.listMyResearchTitles(user.id),
    ])

    logRouteSuccess({
      msg: 'faculty_bootstrap_done',
      route: '/api/me/bootstrap',
      requestId,
      auth_ms: authMs,
      data_ms: Date.now() - dataStart,
      cache_state: 'dynamic',
      result_count: education.length + publications.length + engagements.length + researchTitles.length,
      ms: Date.now() - start,
    })

    return NextResponse.json({
      profile,
      education,
      publications,
      engagements,
      researchTitles,
    })
  } catch (error) {
    logRouteError({
      msg: 'faculty_bootstrap_failed',
      route: '/api/me/bootstrap',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    })

    return toErrorResponse(error)
  }
}
