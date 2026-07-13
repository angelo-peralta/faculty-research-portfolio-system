import 'server-only'

import { randomUUID } from 'node:crypto'
import { NotificationAudience as DbNotificationAudience, NotificationKind as DbNotificationKind, UserRole as DbUserRole } from '@/lib/db/enums'
import { execute, queryRows, transaction, type RowDataPacket } from '@/lib/db/mysql'
import type {
  NotificationItem,
  NotificationKind,
  NotificationListResponse,
  NotificationReadPayload,
  NotificationReadResult,
} from '@/lib/types'

const ADMIN_NOTIFICATION_ROLES = [DbUserRole.main_admin, DbUserRole.secondary_admin]

function toDbNotificationKind(kind: NotificationKind) {
  return kind as DbNotificationKind
}

function toNotificationItem(row: {
  id: string
  kind: DbNotificationKind
  title: string
  message: string
  href: string | null
  createdAt: Date | string
  readAt: Date | string | null
  actorUserId: string | null
  actorName: string | null
  relatedUserId: string | null
  relatedUserName: string | null
}): NotificationItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    message: row.message,
    href: row.href,
    created_at: new Date(row.createdAt).toISOString(),
    read_at: row.readAt ? new Date(row.readAt).toISOString() : null,
    actor_user_id: row.actorUserId,
    actor_name: row.actorName,
    related_user_id: row.relatedUserId,
    related_user_name: row.relatedUserName,
  }
}

async function listNotificationsForAudience(
  userId: string,
  audience: DbNotificationAudience,
  options: {
    limit?: number
    unreadOnly?: boolean
  } = {}
): Promise<NotificationListResponse> {
  const unreadOnly = options.unreadOnly ?? false
  const limit = options.limit ?? 20
  const rows = await queryRows<RowDataPacket & {
    id: string
    kind: DbNotificationKind
    title: string
    message: string
    href: string | null
    createdAt: Date | string
    readAt: Date | string | null
    actorUserId: string | null
    actorName: string | null
    relatedUserId: string | null
    relatedUserName: string | null
  }>(
    `
      SELECT
        n.id,
        n.kind,
        n.title,
        n.message,
        n.href,
        n.created_at AS createdAt,
        un.read_at AS readAt,
        n.actor_user_id AS actorUserId,
        au.name AS actorName,
        n.related_user_id AS relatedUserId,
        ru.name AS relatedUserName
      FROM user_notifications AS un
      INNER JOIN notifications AS n ON n.id = un.notification_id
      LEFT JOIN users AS au ON au.id = n.actor_user_id
      LEFT JOIN users AS ru ON ru.id = n.related_user_id
      WHERE un.user_id = ?
        AND n.audience = ?
        ${unreadOnly ? 'AND un.read_at IS NULL' : ''}
      ORDER BY n.created_at DESC
      LIMIT ?
    `,
    [userId, audience, limit]
  )
  const unreadRows = await queryRows<RowDataPacket & { count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM user_notifications AS un
      INNER JOIN notifications AS n ON n.id = un.notification_id
      WHERE un.user_id = ?
        AND n.audience = ?
        AND un.read_at IS NULL
    `,
    [userId, audience]
  )

  return {
    items: rows.map(toNotificationItem),
    unread_count: Number(unreadRows[0]?.count ?? 0),
  }
}

async function countUnreadForAudience(userId: string, audience: DbNotificationAudience) {
  const rows = await queryRows<RowDataPacket & { count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM user_notifications AS un
      INNER JOIN notifications AS n ON n.id = un.notification_id
      WHERE un.user_id = ?
        AND un.read_at IS NULL
        AND n.audience = ?
    `,
    [userId, audience]
  )

  return Number(rows[0]?.count ?? 0)
}

async function markNotificationsReadForAudience(
  userId: string,
  audience: DbNotificationAudience,
  payload: NotificationReadPayload
): Promise<NotificationReadResult> {
  if (!payload.markAll && (!payload.ids || payload.ids.length === 0)) {
    return {
      unread_count: await countUnreadForAudience(userId, audience),
    }
  }

  const params: unknown[] = [userId, audience]
  const idFilter = payload.markAll
    ? ''
    : `AND un.notification_id IN (${payload.ids!.map(() => '?').join(', ')})`

  if (!payload.markAll) {
    params.push(...payload.ids!)
  }

  await execute(
    `
      UPDATE user_notifications AS un
      INNER JOIN notifications AS n ON n.id = un.notification_id
      SET un.read_at = CURRENT_TIMESTAMP(3)
      WHERE un.user_id = ?
        AND n.audience = ?
        ${idFilter}
    `,
    params
  )

  return {
    unread_count: await countUnreadForAudience(userId, audience),
  }
}

async function createNotificationForUsers(input: {
  audience: DbNotificationAudience
  kind: NotificationKind
  title: string
  message: string
  href?: string | null
  actorUserId?: string | null
  relatedUserId?: string | null
  userIds: string[]
}) {
  const recipientIds = Array.from(new Set(input.userIds.filter(Boolean)))

  if (recipientIds.length === 0) {
    return null
  }

  return transaction(async (connection) => {
    const notificationId = randomUUID()
    await execute(
      `
        INSERT INTO notifications (
          id,
          audience,
          kind,
          title,
          message,
          href,
          actor_user_id,
          related_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        notificationId,
        input.audience,
        toDbNotificationKind(input.kind),
        input.title.trim(),
        input.message.trim(),
        input.href ?? null,
        input.actorUserId ?? null,
        input.relatedUserId ?? null,
      ],
      connection
    )

    for (const userId of recipientIds) {
      await execute(
        `
          INSERT IGNORE INTO user_notifications (user_id, notification_id)
          VALUES (?, ?)
        `,
        [userId, notificationId],
        connection
      )
    }

    return notificationId
  })
}

async function listAdminRecipientIds() {
  const placeholders = ADMIN_NOTIFICATION_ROLES.map(() => '?').join(', ')
  const admins = await queryRows<RowDataPacket & { id: string }>(
    `
      SELECT DISTINCT u.id
      FROM users AS u
      INNER JOIN user_role_assignments AS ura ON ura.user_id = u.id
      WHERE u.access_status = 'active'
        AND ura.role IN (${placeholders})
    `,
    ADMIN_NOTIFICATION_ROLES
  )

  return admins.map((admin) => admin.id)
}

export const NotificationService = {
  listFacultyNotifications(userId: string, options?: { limit?: number; unreadOnly?: boolean }) {
    return listNotificationsForAudience(userId, DbNotificationAudience.faculty, options)
  },

  listAdminNotifications(userId: string, options?: { limit?: number; unreadOnly?: boolean }) {
    return listNotificationsForAudience(userId, DbNotificationAudience.admin, options)
  },

  markFacultyNotificationsRead(userId: string, payload: NotificationReadPayload) {
    return markNotificationsReadForAudience(userId, DbNotificationAudience.faculty, payload)
  },

  markAdminNotificationsRead(userId: string, payload: NotificationReadPayload) {
    return markNotificationsReadForAudience(userId, DbNotificationAudience.admin, payload)
  },

  async createFacultyBroadcastNotifications(args: {
    title: string
    message: string
    createdByUserId: string
  }) {
    const recipients = await queryRows<RowDataPacket & { id: string }>(
      `
        SELECT DISTINCT u.id
        FROM users AS u
        INNER JOIN user_role_assignments AS ura ON ura.user_id = u.id
        INNER JOIN user_preferences AS up ON up.user_id = u.id
        WHERE u.access_status = 'active'
          AND ura.role = 'faculty'
          AND up.system_updates = 1
      `
    )

    return createNotificationForUsers({
      audience: DbNotificationAudience.faculty,
      kind: 'broadcast',
      title: args.title,
      message: args.message,
      href: '/faculty/notifications',
      actorUserId: args.createdByUserId,
      userIds: recipients.map((recipient) => recipient.id),
    })
  },

  async createAdminOperationalNotification(args: {
    kind: Exclude<NotificationKind, 'broadcast'>
    title: string
    message: string
    actorUserId?: string | null
    relatedUserId?: string | null
    href?: string | null
  }) {
    const adminIds = await listAdminRecipientIds()

    return createNotificationForUsers({
      audience: DbNotificationAudience.admin,
      kind: args.kind,
      title: args.title,
      message: args.message,
      href: args.href ?? null,
      actorUserId: args.actorUserId ?? null,
      relatedUserId: args.relatedUserId ?? null,
      userIds: adminIds,
    })
  },
}
