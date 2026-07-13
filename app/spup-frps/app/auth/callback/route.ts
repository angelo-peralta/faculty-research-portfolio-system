import { NextResponse, type NextRequest } from 'next/server'
import { buildAppUrl, getServerAppOrigin } from '@/lib/app-origin'
import {
  APP_SESSION_COOKIE_NAME,
  ApiAuthError,
  INACTIVE_ACCOUNT_ERROR_MESSAGE,
  INVALID_DOMAIN_ERROR_MESSAGE,
  OAUTH_STATE_COOKIE_NAME,
  createSession,
  ensureAppUserWithOptions,
  getSessionCookieOptions,
  getWorkspacePath,
} from '@/lib/server/auth'
import { exchangeMicrosoftCode, fetchMicrosoftIdentity } from '@/lib/server/microsoft-oauth'

function getLoginRedirect(origin: string, error: string) {
  return NextResponse.redirect(
    buildAppUrl('/login', {
      origin,
      searchParams: { error },
    })
  )
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value ?? null
  const appOrigin = getServerAppOrigin(requestUrl.origin)

  if (!code || !state || !expectedState || state !== expectedState) {
    const response = getLoginRedirect(appOrigin, 'auth-callback')
    response.cookies.set(OAUTH_STATE_COOKIE_NAME, '', { path: '/', maxAge: 0 })
    return response
  }

  try {
    const token = await exchangeMicrosoftCode(appOrigin, code)
    const identity = await fetchMicrosoftIdentity(token.access_token!)
    const user = await ensureAppUserWithOptions(identity)
    const session = await createSession(user.id)
    const response = NextResponse.redirect(
      buildAppUrl(getWorkspacePath(user.roles), {
        origin: appOrigin,
      })
    )

    response.cookies.set(APP_SESSION_COOKIE_NAME, session.token, getSessionCookieOptions(session.maxAge))
    response.cookies.set(OAUTH_STATE_COOKIE_NAME, '', { path: '/', maxAge: 0 })

    return response
  } catch (callbackError) {
    console.error('Failed to complete auth callback:', callbackError)
    let errorCode = 'auth-callback'

    if (callbackError instanceof ApiAuthError) {
      if (callbackError.message === INVALID_DOMAIN_ERROR_MESSAGE) {
        errorCode = 'invalid-domain'
      } else if (callbackError.message === INACTIVE_ACCOUNT_ERROR_MESSAGE) {
        errorCode = 'inactive-account'
      }
    }

    const response = getLoginRedirect(appOrigin, errorCode)
    response.cookies.set(APP_SESSION_COOKIE_NAME, '', getSessionCookieOptions(0))
    response.cookies.set(OAUTH_STATE_COOKIE_NAME, '', { path: '/', maxAge: 0 })
    return response
  }
}
