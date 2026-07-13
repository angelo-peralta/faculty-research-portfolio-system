import { NextResponse } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { FacultySettingsService } from '@/lib/server/faculty-settings'
import { toErrorResponse } from '@/lib/server/http'

export async function GET() {
  try {
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const result = await FacultySettingsService.buildMyCsvZip(user)

    return new NextResponse(result.content, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
