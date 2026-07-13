import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { toErrorResponse } from '@/lib/server/http'
import { NotificationService } from '@/lib/server/notifications'
import { notificationListQuerySchema } from '@/lib/validation/faculty-content'

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAdminUser()
    const query = notificationListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    const notifications = await NotificationService.listAdminNotifications(user.id, {
      limit: query.limit,
      unreadOnly: query.unread_only,
    })

    return NextResponse.json(notifications)
  } catch (error) {
    return toErrorResponse(error)
  }
}
