import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server/auth'
import {
  getFacultyAssetPathForUser,
  isFacultyAssetSignKind,
  signFacultyAssetPath,
} from '@/lib/server/faculty-asset-signing'
import { toErrorResponse } from '@/lib/server/http'

export async function GET(request: Request) {
  try {
    await requireAdminUser()
    const { searchParams } = new URL(request.url)
    const facultyId = searchParams.get('facultyId')?.trim()
    const kind = searchParams.get('kind')
    const id = searchParams.get('id')

    if (!facultyId) {
      return NextResponse.json({ error: 'Missing faculty id.' }, { status: 400 })
    }

    if (!isFacultyAssetSignKind(kind)) {
      return NextResponse.json({ error: 'Invalid asset kind.' }, { status: 400 })
    }

    const path = await getFacultyAssetPathForUser(facultyId, kind, id)

    if (!path) {
      return NextResponse.json({ error: 'Asset not found.' }, { status: 404 })
    }

    const url = await signFacultyAssetPath(path)

    if (!url) {
      return NextResponse.json({ error: 'Unable to sign asset URL.' }, { status: 500 })
    }

    return NextResponse.json({ url })
  } catch (error) {
    return toErrorResponse(error)
  }
}
