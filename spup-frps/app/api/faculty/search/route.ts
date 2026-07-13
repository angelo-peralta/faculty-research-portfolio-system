import { NextResponse } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toErrorResponse } from '@/lib/server/http'

export async function GET(request: Request) {
  try {
    const { user } = await requireAppUser()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? searchParams.get('q') ?? ''
    const excludeUserId = searchParams.get('exclude')?.trim() || user.id

    const results = await FacultyDataService.searchFacultyCoAuthors(search, excludeUserId)

    return NextResponse.json(results)
  } catch (error) {
    return toErrorResponse(error)
  }
}
