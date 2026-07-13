import { NextResponse, type NextRequest } from 'next/server'
import { buildAppUrl, getServerAppOrigin } from '@/lib/app-origin'

export async function proxy(request: NextRequest) {
  const url = request.nextUrl

  if (
    url.searchParams.has('code') &&
    (url.pathname === '/' || url.pathname === '/login')
  ) {
    const callbackUrl = buildAppUrl('/auth/callback', {
      origin: getServerAppOrigin(url.origin),
      searchParams: url.searchParams,
    })
    return NextResponse.redirect(callbackUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
