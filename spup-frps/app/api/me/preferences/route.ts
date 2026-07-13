import { NextResponse } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { toErrorResponse } from '@/lib/server/http'
import { parseValidatedJson } from '@/lib/server/request-validation'
import { FacultySettingsService } from '@/lib/server/faculty-settings'
import { userPreferencesPatchSchema } from '@/lib/validation/faculty-content'

export async function GET() {
  try {
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const preferences = await FacultySettingsService.getMyPreferences(user.id)

    return NextResponse.json(preferences)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const payload = await parseValidatedJson(request, userPreferencesPatchSchema)
    const preferences = await FacultySettingsService.updateMyPreferences(user.id, payload)

    return NextResponse.json(preferences)
  } catch (error) {
    return toErrorResponse(error)
  }
}
