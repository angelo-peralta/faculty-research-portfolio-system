import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toErrorResponse } from '@/lib/server/http'

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ id: string; engagementId: string }>
  }
) {
  try {
    await requireAdminUser({ mainAdminOnly: true })
    const { id, engagementId } = await context.params
    const deleted = await FacultyDataService.deleteEngagement(id, engagementId)

    if (!deleted) {
      return NextResponse.json({ error: 'Engagement not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
