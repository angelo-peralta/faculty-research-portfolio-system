import { NextResponse, type NextRequest } from 'next/server'
import { getServerAppOrigin } from '@/lib/app-origin'
import { OAUTH_STATE_COOKIE_NAME } from '@/lib/server/auth'
import { buildMicrosoftAuthorizeUrl, createOAuthState } from '@/lib/server/microsoft-oauth'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const origin = getServerAppOrigin(requestUrl.origin)

  try {
    const state = createOAuthState()
    const response = NextResponse.redirect(buildMicrosoftAuthorizeUrl(origin, state))

    response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    })

    return response
  } catch (error) {
    console.error('Failed to start Microsoft sign-in:', error)
    return NextResponse.redirect(new URL('/login?error=auth-config', origin))
  }
}
