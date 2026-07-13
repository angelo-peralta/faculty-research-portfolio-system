import { NextResponse, type NextRequest } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toErrorResponse } from '@/lib/server/http'
import { getRequestId, logRouteError, logRouteSuccess } from '@/lib/server/route-logging'
import { parseValidatedJson } from '@/lib/server/request-validation'
import { profileUpdatePayloadSchema } from '@/lib/validation/faculty-content'

export async function GET(request: Request) {
  const start = Date.now()
  const requestId = getRequestId(request)

  try {
    const authStart = Date.now()
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const authMs = Date.now() - authStart
    const dataStart = Date.now()
    const profile = await FacultyDataService.getMyProfile(user)

    logRouteSuccess({
      msg: 'faculty_profile_done',
      route: '/api/me/profile',
      requestId,
      auth_ms: authMs,
      data_ms: Date.now() - dataStart,
      cache_state: 'dynamic',
      ms: Date.now() - start,
    })

    return NextResponse.json(profile)
  } catch (error) {
    logRouteError({
      msg: 'faculty_profile_failed',
      route: '/api/me/profile',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    })

    return toErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const payload = await parseValidatedJson(request, profileUpdatePayloadSchema)
    const profile = await FacultyDataService.updateMyProfile(user, payload)

    return NextResponse.json(profile)
  } catch (error) {
    return toErrorResponse(error)
  }
}
