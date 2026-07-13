import 'server-only'

import { randomBytes } from 'node:crypto'
import { buildAppUrl } from '@/lib/app-origin'
import type { MicrosoftIdentity } from '@/lib/server/auth'

interface MicrosoftTokenResponse {
  access_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}

interface MicrosoftGraphProfile {
  id?: string
  displayName?: string | null
  mail?: string | null
  userPrincipalName?: string | null
}

function getRequiredEnv(key: string) {
  const value = process.env[key]?.trim()

  if (!value) {
    throw new Error(`Missing ${key}.`)
  }

  return value
}

function getTenantId() {
  return getRequiredEnv('AZURE_AD_TENANT_ID')
}

function getRedirectUri(origin: string) {
  return process.env.AZURE_AD_REDIRECT_URI?.trim() || buildAppUrl('/auth/callback', { origin }).toString()
}

function getMicrosoftBaseUrl() {
  return `https://login.microsoftonline.com/${encodeURIComponent(getTenantId())}/oauth2/v2.0`
}

export function createOAuthState() {
  return randomBytes(24).toString('base64url')
}

export function buildMicrosoftAuthorizeUrl(origin: string, state: string) {
  const authorizeUrl = new URL(`${getMicrosoftBaseUrl()}/authorize`)
  authorizeUrl.searchParams.set('client_id', getRequiredEnv('AZURE_AD_CLIENT_ID'))
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('redirect_uri', getRedirectUri(origin))
  authorizeUrl.searchParams.set('response_mode', 'query')
  authorizeUrl.searchParams.set('scope', 'openid email profile User.Read')
  authorizeUrl.searchParams.set('prompt', 'select_account')
  authorizeUrl.searchParams.set('state', state)

  return authorizeUrl
}

export async function exchangeMicrosoftCode(origin: string, code: string) {
  const tokenResponse = await fetch(`${getMicrosoftBaseUrl()}/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: getRequiredEnv('AZURE_AD_CLIENT_ID'),
      client_secret: getRequiredEnv('AZURE_AD_CLIENT_SECRET'),
      code,
      redirect_uri: getRedirectUri(origin),
      grant_type: 'authorization_code',
      scope: 'openid email profile User.Read',
    }),
    cache: 'no-store',
  })
  const payload = (await tokenResponse.json().catch(() => ({}))) as MicrosoftTokenResponse

  if (!tokenResponse.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || 'Microsoft token exchange failed.')
  }

  return payload
}

function toDataUrl(contentType: string | null, buffer: ArrayBuffer) {
  const mimeType = contentType?.trim() || 'image/jpeg'
  return `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`
}

export async function fetchMicrosoftIdentity(accessToken: string): Promise<MicrosoftIdentity> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  }
  const [profileResponse, photoResponse] = await Promise.all([
    fetch('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName', {
      headers,
      cache: 'no-store',
    }),
    fetch('https://graph.microsoft.com/v1.0/me/photos/96x96/$value', {
      headers,
      cache: 'no-store',
    }),
  ])

  if (!profileResponse.ok) {
    throw new Error('Failed to load Microsoft Graph profile.')
  }

  const profile = (await profileResponse.json()) as MicrosoftGraphProfile
  const email = (profile.mail ?? profile.userPrincipalName ?? '').trim().toLowerCase()
  const name = profile.displayName?.trim() || email.split('@')[0] || 'User'

  if (!profile.id || !email) {
    throw new Error('Microsoft profile is missing a stable ID or email address.')
  }

  let avatarUrl: string | null = null

  if (photoResponse.ok) {
    avatarUrl = toDataUrl(photoResponse.headers.get('content-type'), await photoResponse.arrayBuffer())
  } else if (![401, 403, 404].includes(photoResponse.status)) {
    console.error('Failed to fetch Microsoft Graph profile photo:', photoResponse.status, photoResponse.statusText)
  }

  return {
    providerAccountId: profile.id,
    email,
    name,
    avatarUrl,
  }
}
