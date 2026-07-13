import { NextResponse } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toErrorResponse } from '@/lib/server/http'

export async function GET() {
  try {
    const { user } = await requireAppUser({ roles: ['faculty'] })
    const completion = await FacultyDataService.getProfileCompletion(user.id)

    return NextResponse.json(completion)
  } catch (error) {
    return toErrorResponse(error)
  }
}
