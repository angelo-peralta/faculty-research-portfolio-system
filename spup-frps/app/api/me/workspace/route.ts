import { NextResponse } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { FacultySettingsService } from '@/lib/server/faculty-settings'
import { toErrorResponse } from '@/lib/server/http'
import { getRequestId, logRouteError, logRouteSuccess } from '@/lib/server/route-logging'

const emptyNotificationPreview = {
  items: [],
  unread_count: 0,
}

export async function GET(request: Request) {
  const start = Date.now()
  const requestId = getRequestId(request)

  try {
    const authStart = Date.now()
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const authMs = Date.now() - authStart
    const dataStart = Date.now()
    const preferences = await FacultySettingsService.getMyPreferences(user.id)

    logRouteSuccess({
      msg: 'faculty_workspace_done',
      route: '/api/me/workspace',
      requestId,
      auth_ms: authMs,
      data_ms: Date.now() - dataStart,
      cache_state: 'dynamic',
      result_count: 0,
      ms: Date.now() - start,
    })

    return NextResponse.json({
      preferences,
      notificationPreview: emptyNotificationPreview,
      prompt_needed: !preferences.initial_prompt_seen_at,
    })
  } catch (error) {
    logRouteError({
      msg: 'faculty_workspace_failed',
      route: '/api/me/workspace',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    })

    return toErrorResponse(error)
  }
}
