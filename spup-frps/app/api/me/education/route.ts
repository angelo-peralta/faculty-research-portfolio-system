import { NextResponse, type NextRequest } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toErrorResponse } from '@/lib/server/http'
import { NotificationService } from '@/lib/server/notifications'
import { parseValidatedJson } from '@/lib/server/request-validation'
import { educationPayloadSchema } from '@/lib/validation/faculty-content'

export async function GET() {
  try {
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const entries = await FacultyDataService.listMyEducation(user.id)

    return NextResponse.json(entries)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const payload = await parseValidatedJson(request, educationPayloadSchema)
    const entry = await FacultyDataService.upsertEducation(user.id, payload)
    await NotificationService.createAdminOperationalNotification({
      kind: 'education_added',
      title: 'New education entry added',
      message: `${user.name} added ${entry.degree} at ${entry.institution}.`,
      actorUserId: user.id,
      relatedUserId: user.id,
      href: `/admin/faculty/${user.id}`,
    })

    return NextResponse.json(entry)
  } catch (error) {
    return toErrorResponse(error)
  }
}
