import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { toErrorResponse } from '@/lib/server/http'
import { NotificationService } from '@/lib/server/notifications'
import { getRequestId, logRouteError, logRouteSuccess } from '@/lib/server/route-logging'

export async function GET(request: Request) {
  const start = Date.now()
  const requestId = getRequestId(request)

  try {
    const authStart = Date.now()
    const { user } = await requireAdminUser()
    const authMs = Date.now() - authStart
    const dataStart = Date.now()
    const notificationPreview = await NotificationService.listAdminNotifications(user.id, { limit: 5 })

    logRouteSuccess({
      msg: 'admin_workspace_done',
      route: '/api/admin/workspace',
      requestId,
      auth_ms: authMs,
      data_ms: Date.now() - dataStart,
      cache_state: 'dynamic',
      result_count: notificationPreview.items.length,
      ms: Date.now() - start,
    })

    return NextResponse.json({
      notificationPreview,
    })
  } catch (error) {
    logRouteError({
      msg: 'admin_workspace_failed',
      route: '/api/admin/workspace',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    })

    return toErrorResponse(error)
  }
}
