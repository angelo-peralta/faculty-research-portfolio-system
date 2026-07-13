import 'server-only'

import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { AccessStatus as DbAccessStatus, FacultyInviteStatus as DbFacultyInviteStatus, UserRole as DbUserRole } from '@/lib/db/enums'
import { execute, queryOne, queryRows, transaction, toDate, type PoolConnection, type RowDataPacket } from '@/lib/db/mysql'
import { NotificationService } from '@/lib/server/notifications'
import type { User, UserRole } from '@/lib/types'

export const APP_SESSION_COOKIE_NAME = 'frp_session'
export const OAUTH_STATE_COOKIE_NAME = 'frp_oauth_state'

const ROLE_FROM_DB: Record<DbUserRole, UserRole> = {
  faculty: 'faculty',
  secondary_admin: 'secondary-admin',
  main_admin: 'main-admin',
}

const ROLE_TO_DB: Record<UserRole, DbUserRole> = {
  faculty: DbUserRole.faculty,
  'secondary-admin': DbUserRole.secondary_admin,
  'main-admin': DbUserRole.main_admin,
}

export class ApiAuthError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const LAST_LOGIN_SYNC_INTERVAL_MS = 60 * 60 * 1000
const SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000
const ALLOWED_EMAIL_DOMAIN = 'spup.edu.ph'
const INVALID_DOMAIN_ERROR_MESSAGE = `Only @${ALLOWED_EMAIL_DOMAIN} accounts can access this system.`
const INACTIVE_ACCOUNT_ERROR_MESSAGE = 'Your account is inactive. Please contact a main administrator.'

export interface MicrosoftIdentity {
  providerAccountId: string
  email: string
  name: string
  avatarUrl?: string | null
}

interface InviteRow extends RowDataPacket {
  id: string
  email: string
  name: string | null
  department: string | null
  employmentStatus: string | null
  inviteStatus: DbFacultyInviteStatus
  linkedUserId: string | null
}

interface UserRow extends RowDataPacket {
  id: string
  azureObjectId: string | null
  email: string
  name: string
  avatarUrl: string | null
  accessStatus: DbAccessStatus
  lastLoginAt: Date | string | null
}

interface RoleRow extends RowDataPacket {
  role: DbUserRole
}

function mapRoles(roles: DbUserRole[]) {
  return roles.map((role) => ROLE_FROM_DB[role])
}

function normalizeString(value: string | null | undefined) {
  const nextValue = value?.trim()
  return nextValue ? nextValue : null
}

function getInviteSeedName(inviteName: string | null | undefined, fallbackName: string) {
  return normalizeString(inviteName) ?? fallbackName
}

function getEmailFallbackName(email: string | undefined) {
  return email?.split('@')[0] ?? 'User'
}

function hasAllowedInstitutionDomain(email: string) {
  return email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
}

function isLastLoginSyncStale(lastLoginAt: Date | string | null | undefined, now: Date) {
  const lastLogin = toDate(lastLoginAt)

  if (!lastLogin) {
    return true
  }

  return now.getTime() - lastLogin.getTime() >= LAST_LOGIN_SYNC_INTERVAL_MS
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function mapAppUser(args: {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  roles: DbUserRole[]
}): User {
  return {
    id: args.id,
    email: args.email,
    name: args.name,
    avatar_url: args.avatarUrl,
    roles: mapRoles(args.roles),
  }
}

async function getInviteByEmail(email: string, executor?: PoolConnection) {
  return queryOne<InviteRow>(
    `
      SELECT
        id,
        email,
        name,
        department,
        employment_status AS employmentStatus,
        invite_status AS inviteStatus,
        linked_user_id AS linkedUserId
      FROM faculty_invites
      WHERE email = ?
      LIMIT 1
    `,
    [email],
    executor
  )
}

async function getInviteRoles(inviteId: string, executor?: PoolConnection) {
  const rows = await queryRows<RoleRow>(
    'SELECT role FROM faculty_invite_roles WHERE invite_id = ? ORDER BY role',
    [inviteId],
    executor
  )

  return rows.map((row) => row.role)
}

async function getRolesForUser(userId: string, executor?: PoolConnection) {
  const rows = await queryRows<RoleRow>(
    'SELECT role FROM user_role_assignments WHERE user_id = ? ORDER BY role',
    [userId],
    executor
  )

  return rows.map((row) => row.role)
}

async function getUserByMicrosoftIdentity(identity: MicrosoftIdentity, executor?: PoolConnection) {
  return queryOne<UserRow>(
    `
      SELECT
        u.id,
        u.azure_object_id AS azureObjectId,
        u.email,
        u.name,
        u.avatar_url AS avatarUrl,
        u.access_status AS accessStatus,
        u.last_login_at AS lastLoginAt
      FROM users AS u
      LEFT JOIN accounts AS a
        ON a.user_id = u.id
        AND a.provider = 'azure'
        AND a.provider_account_id = ?
      WHERE a.provider_account_id IS NOT NULL
        OR u.azure_object_id = ?
        OR u.email = ?
      ORDER BY
        CASE
          WHEN a.provider_account_id IS NOT NULL THEN 0
          WHEN u.azure_object_id = ? THEN 1
          ELSE 2
        END
      LIMIT 1
    `,
    [identity.providerAccountId, identity.providerAccountId, identity.email, identity.providerAccountId],
    executor
  )
}

async function getUserById(userId: string, executor?: PoolConnection) {
  return queryOne<UserRow>(
    `
      SELECT
        id,
        azure_object_id AS azureObjectId,
        email,
        name,
        avatar_url AS avatarUrl,
        access_status AS accessStatus,
        last_login_at AS lastLoginAt
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [userId],
    executor
  )
}

async function ensureFacultyProfileSeed(args: {
  userId: string
  invite: InviteRow | null
  roles: DbUserRole[]
  executor: PoolConnection
}) {
  const shouldHaveFacultyProfile =
    args.roles.includes(DbUserRole.faculty) ||
    Boolean(args.invite?.department) ||
    Boolean(args.invite?.employmentStatus)

  if (!shouldHaveFacultyProfile) {
    return
  }

  await execute(
    `
      INSERT INTO faculty_profiles (
        user_id,
        department,
        employment_status
      )
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        department = COALESCE(department, VALUES(department)),
        employment_status = COALESCE(employment_status, VALUES(employment_status))
    `,
    [
      args.userId,
      args.invite?.department ?? null,
      args.invite?.employmentStatus ?? null,
    ],
    args.executor
  )
}

async function persistRoles(args: {
  userId: string
  roles: DbUserRole[]
  executor: PoolConnection
}) {
  for (const role of args.roles) {
    await execute(
      `
        INSERT IGNORE INTO user_role_assignments (user_id, role)
        VALUES (?, ?)
      `,
      [args.userId, role],
      args.executor
    )
  }
}

export function toDbRole(role: UserRole) {
  return ROLE_TO_DB[role]
}

export function getDefaultRole(roles: UserRole[]) {
  if (roles.includes('main-admin')) {
    return 'main-admin'
  }

  if (roles.includes('secondary-admin')) {
    return 'secondary-admin'
  }

  return 'faculty'
}

export function getWorkspacePath(roles: UserRole[]) {
  return getDefaultRole(roles) === 'faculty' ? '/faculty/profile' : '/admin/dashboard'
}

export async function ensureAppUser(identity: MicrosoftIdentity) {
  return ensureAppUserWithOptions(identity)
}

export async function ensureAppUserWithOptions(identity: MicrosoftIdentity) {
  const email = identity.email.trim().toLowerCase()

  if (!email) {
    throw new ApiAuthError(400, 'Authenticated user is missing an email address.')
  }

  if (!hasAllowedInstitutionDomain(email)) {
    throw new ApiAuthError(403, INVALID_DOMAIN_ERROR_MESSAGE)
  }

  const now = new Date()
  let createdNewFacultyUser = false

  const user = await transaction(async (connection) => {
    const [invite, existingUser] = await Promise.all([
      getInviteByEmail(email, connection),
      getUserByMicrosoftIdentity(identity, connection),
    ])
    const inviteRoles = invite ? await getInviteRoles(invite.id, connection) : []
    const activeInvite =
      invite &&
      invite.inviteStatus !== DbFacultyInviteStatus.cancelled &&
      (!invite.linkedUserId || invite.linkedUserId === existingUser?.id)
        ? invite
        : null

    if (existingUser?.accessStatus === DbAccessStatus.inactive) {
      throw new ApiAuthError(403, INACTIVE_ACCOUNT_ERROR_MESSAGE)
    }

    let persistedUser = existingUser
    const avatarUrl = identity.avatarUrl ?? existingUser?.avatarUrl ?? null
    const existingName = normalizeString(existingUser?.name)
    const name =
      existingName && existingName !== getEmailFallbackName(existingUser?.email)
        ? existingName
        : getInviteSeedName(activeInvite?.name, identity.name || getEmailFallbackName(email))

    if (!persistedUser) {
      const id = randomUUID()

      await execute(
        `
          INSERT INTO users (
            id,
            azure_object_id,
            email,
            name,
            avatar_url,
            last_login_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [id, identity.providerAccountId, email, name, avatarUrl, now],
        connection
      )
      persistedUser = {
        id,
        azureObjectId: identity.providerAccountId,
        email,
        name,
        avatarUrl,
        accessStatus: DbAccessStatus.active,
        lastLoginAt: now,
      } as UserRow
    } else {
      const nextName = name
      const shouldUpdateLastLogin = isLastLoginSyncStale(existingUser.lastLoginAt, now)

      await execute(
        `
          UPDATE users
          SET
            azure_object_id = COALESCE(azure_object_id, ?),
            email = ?,
            name = ?,
            avatar_url = ?,
            last_login_at = CASE WHEN ? THEN ? ELSE last_login_at END
          WHERE id = ?
        `,
        [
          identity.providerAccountId,
          email,
          nextName,
          avatarUrl,
          shouldUpdateLastLogin,
          now,
          existingUser.id,
        ],
        connection
      )
      persistedUser = {
        ...existingUser,
        azureObjectId: existingUser.azureObjectId ?? identity.providerAccountId,
        email,
        name: nextName,
        avatarUrl,
        lastLoginAt: shouldUpdateLastLogin ? now : existingUser.lastLoginAt,
      } as UserRow
    }

    await execute(
      `
        INSERT INTO accounts (
          user_id,
          provider,
          provider_account_id,
          account_type
        )
        VALUES (?, 'azure', ?, 'oauth')
        ON DUPLICATE KEY UPDATE
          user_id = VALUES(user_id),
          updated_at = CURRENT_TIMESTAMP(3)
      `,
      [persistedUser.id, identity.providerAccountId],
      connection
    )

    const existingRoles = await getRolesForUser(persistedUser.id, connection)
    const nextRoles =
      existingRoles.length === 0 && inviteRoles.length === 0
        ? [DbUserRole.faculty]
        : Array.from(new Set([...existingRoles, ...inviteRoles]))

    await persistRoles({
      userId: persistedUser.id,
      roles: nextRoles,
      executor: connection,
    })

    if (activeInvite) {
      await execute(
        `
          UPDATE faculty_invites
          SET linked_user_id = ?, invite_status = 'linked'
          WHERE id = ?
        `,
        [persistedUser.id, activeInvite.id],
        connection
      )
    }

    await ensureFacultyProfileSeed({
      userId: persistedUser.id,
      invite: activeInvite,
      roles: nextRoles,
      executor: connection,
    })

    createdNewFacultyUser = !existingUser && nextRoles.includes(DbUserRole.faculty)

    return mapAppUser({
      id: persistedUser.id,
      email: persistedUser.email,
      name: persistedUser.name,
      avatarUrl: persistedUser.avatarUrl ?? null,
      roles: nextRoles,
    })
  })

  if (createdNewFacultyUser) {
    void NotificationService.createAdminOperationalNotification({
      kind: 'faculty_signed_in',
      title: 'New faculty signed in',
      message: `${user.name} signed in to the portfolio for the first time.`,
      actorUserId: user.id,
      relatedUserId: user.id,
      href: `/admin/faculty/${user.id}`,
    }).catch((error) => {
      console.error('Failed to create first-login faculty notification:', error)
    })
  }

  return user
}

export async function createSession(userId: string) {
  const token = randomBytes(48).toString('base64url')
  const tokenHash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS)

  await execute(
    `
      INSERT INTO sessions (user_id, session_token_hash, expires_at)
      VALUES (?, ?, ?)
    `,
    [userId, tokenHash, expiresAt]
  )

  return {
    token,
    expiresAt,
    maxAge: SESSION_MAX_AGE_SECONDS,
  }
}

export function getSessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

async function readPersistedAppUser(userId: string) {
  const [existingUser, roles] = await Promise.all([
    getUserById(userId),
    getRolesForUser(userId),
  ])

  if (!existingUser || roles.length === 0) {
    throw new ApiAuthError(401, 'Authentication required.')
  }

  if (existingUser.accessStatus === DbAccessStatus.inactive) {
    throw new ApiAuthError(403, INACTIVE_ACCOUNT_ERROR_MESSAGE)
  }

  return mapAppUser({
    id: existingUser.id,
    email: existingUser.email,
    name: existingUser.name,
    avatarUrl: existingUser.avatarUrl ?? null,
    roles,
  })
}

export async function deleteSessionByToken(token: string | null | undefined) {
  if (!token) {
    return
  }

  await execute(
    'DELETE FROM sessions WHERE session_token_hash = ?',
    [hashSessionToken(token)]
  )
}

async function getCurrentSessionUserId() {
  const cookieStore = await cookies()
  const token = cookieStore.get(APP_SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  const session = await queryOne<RowDataPacket & { userId: string }>(
    `
      SELECT user_id AS userId
      FROM sessions
      WHERE session_token_hash = ?
        AND expires_at > CURRENT_TIMESTAMP(3)
      LIMIT 1
    `,
    [hashSessionToken(token)]
  )

  return session?.userId ?? null
}

export async function requireAppUser(options?: {
  roles?: UserRole[]
}): Promise<{
  user: User
}> {
  const userId = await getCurrentSessionUserId()

  if (!userId) {
    throw new ApiAuthError(401, 'Authentication required.')
  }

  const user = await readPersistedAppUser(userId)

  if (options?.roles?.length && !user.roles.some((role) => options.roles?.includes(role))) {
    throw new ApiAuthError(403, 'You do not have access to this resource.')
  }

  return { user }
}

export const getCurrentAppUser = cache(async () => requireAppUser())
export const getCurrentAdminUser = cache(async () => requireAdminUser())

export async function requireAdminUser(options?: {
  mainAdminOnly?: boolean
}): Promise<{
  user: User
}> {
  const result = await requireAppUser({
    roles: ['main-admin', 'secondary-admin'],
  })

  if (options?.mainAdminOnly && !result.user.roles.includes('main-admin')) {
    throw new ApiAuthError(403, 'Only main administrators can perform this action.')
  }

  return result
}

export async function upsertRoleByEmail(email: string, role: UserRole) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await queryOne<RowDataPacket & { id: string }>(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [normalizedEmail]
  )

  if (!user) {
    throw new Error(`No app user found for ${normalizedEmail}. Sign in once before bootstrapping roles.`)
  }

  await execute(
    `
      INSERT IGNORE INTO user_role_assignments (user_id, role)
      VALUES (?, ?)
    `,
    [user.id, toDbRole(role)]
  )
}

export { ALLOWED_EMAIL_DOMAIN, INVALID_DOMAIN_ERROR_MESSAGE, INACTIVE_ACCOUNT_ERROR_MESSAGE }
