import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { toErrorResponse } from '@/lib/server/http'
import { PushBroadcastService } from '@/lib/server/push-broadcasts'
import { parseValidatedJson } from '@/lib/server/request-validation'
import { adminBroadcastPayloadSchema } from '@/lib/validation/faculty-content'

export async function GET() {
  try {
    await requireAdminUser()
    const broadcasts = await PushBroadcastService.listBroadcasts()

    return NextResponse.json(broadcasts)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAdminUser()
    const payload = await parseValidatedJson(request, adminBroadcastPayloadSchema)
    const broadcast = await PushBroadcastService.createBroadcast(user.id, payload)

    return NextResponse.json(broadcast, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
