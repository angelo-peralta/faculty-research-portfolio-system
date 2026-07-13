import { NextResponse } from 'next/server'
import { requireAppUser } from '@/lib/server/auth'
import { toErrorResponse } from '@/lib/server/http'
import { lookupOpenAlexPublicationByDoi } from '@/lib/server/openalex'

export async function GET(request: Request) {
  try {
    await requireAppUser()
    const { searchParams } = new URL(request.url)
    const doi = searchParams.get('doi')?.trim()

    if (!doi) {
      return NextResponse.json({ error: 'Enter a DOI before looking up publication metadata.' }, { status: 400 })
    }

    const result = await lookupOpenAlexPublicationByDoi(doi)

    if (!result) {
      return NextResponse.json({ error: 'No OpenAlex record was found for that DOI.' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
