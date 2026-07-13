import { NextResponse } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { toErrorResponse } from '@/lib/server/http'
import { parseValidatedJson } from '@/lib/server/request-validation'
import { FacultySettingsService } from '@/lib/server/faculty-settings'
import {
  pushSubscriptionDeleteSchema,
  pushSubscriptionPayloadSchema,
} from '@/lib/validation/faculty-content'

export async function POST(request: Request) {
  try {
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const payload = await parseValidatedJson(request, pushSubscriptionPayloadSchema)

    await FacultySettingsService.upsertPushSubscription(user.id, payload)

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const payload = await parseValidatedJson(request, pushSubscriptionDeleteSchema)
    const success = await FacultySettingsService.deactivatePushSubscription(user.id, payload.endpoint)

    return NextResponse.json({ success })
  } catch (error) {
    return toErrorResponse(error)
  }
}
