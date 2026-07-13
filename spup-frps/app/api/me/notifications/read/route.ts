import { NextResponse } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { toErrorResponse } from '@/lib/server/http'
import { NotificationService } from '@/lib/server/notifications'
import { parseValidatedJson } from '@/lib/server/request-validation'
import { notificationReadPayloadSchema } from '@/lib/validation/faculty-content'

export async function POST(request: Request) {
  try {
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const payload = await parseValidatedJson(request, notificationReadPayloadSchema)
    const result = await NotificationService.markFacultyNotificationsRead(user.id, payload)

    return NextResponse.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
