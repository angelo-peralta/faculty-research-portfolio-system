import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toErrorResponse } from '@/lib/server/http'

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ id: string; researchTitleId: string }>
  }
) {
  try {
    await requireAdminUser({ mainAdminOnly: true })
    const { id, researchTitleId } = await context.params
    const deleted = await FacultyDataService.deleteResearchTitle(id, researchTitleId)

    if (!deleted) {
      return NextResponse.json({ error: 'Research title not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
