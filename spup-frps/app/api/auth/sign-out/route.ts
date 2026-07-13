import { NextResponse, type NextRequest } from 'next/server'
import { APP_SESSION_COOKIE_NAME, deleteSessionByToken, getSessionCookieOptions } from '@/lib/server/auth'

export async function POST(request: NextRequest) {
  const token = request.cookies.get(APP_SESSION_COOKIE_NAME)?.value ?? null
  await deleteSessionByToken(token)

  const response = NextResponse.json({ ok: true })
  response.cookies.set(APP_SESSION_COOKIE_NAME, '', getSessionCookieOptions(0))
  return response
}
