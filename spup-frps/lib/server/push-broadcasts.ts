import { randomUUID } from 'node:crypto'
import webpush from 'web-push'
import { execute, queryOne, queryRows, type RowDataPacket } from '@/lib/db/mysql'
import { NotificationService } from '@/lib/server/notifications'
import type { AdminBroadcastPayload, AdminBroadcastRecord } from '@/lib/types'

function ensurePushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT

  if (!publicKey || !privateKey || !subject) {
    throw new Error('Push delivery is not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.')
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
}

function mapAdminBroadcast(record: {
  id: string
  title: string
  message: string
  targetCount: number
  successCount: number
  failureCount: number
  createdByUserId: string
  createdAt: Date | string
  createdByName: string
}): AdminBroadcastRecord {
  return {
    id: record.id,
    title: record.title,
    message: record.message,
    target_count: Number(record.targetCount),
    success_count: Number(record.successCount),
    failure_count: Number(record.failureCount),
    created_by_user_id: record.createdByUserId,
    created_by_name: record.createdByName,
    created_at: new Date(record.createdAt).toISOString(),
  }
}

function isInvalidSubscriptionError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false
  }

  const statusCode = 'statusCode' in error ? error.statusCode : null
  return statusCode === 404 || statusCode === 410
}

export const PushBroadcastService = {
  async listBroadcasts(): Promise<AdminBroadcastRecord[]> {
    const broadcasts = await queryRows<RowDataPacket & {
      id: string
      title: string
      message: string
      targetCount: number
      successCount: number
      failureCount: number
      createdByUserId: string
      createdAt: Date | string
      createdByName: string
    }>(
      `
        SELECT
          b.id,
          b.title,
          b.message,
          b.target_count AS targetCount,
          b.success_count AS successCount,
          b.failure_count AS failureCount,
          b.created_by_user_id AS createdByUserId,
          b.created_at AS createdAt,
          u.name AS createdByName
        FROM admin_broadcasts AS b
        INNER JOIN users AS u ON u.id = b.created_by_user_id
        ORDER BY b.created_at DESC
        LIMIT 10
      `
    )

    return broadcasts.map(mapAdminBroadcast)
  },

  async createBroadcast(createdByUserId: string, payload: AdminBroadcastPayload): Promise<AdminBroadcastRecord> {
    ensurePushConfig()

    const subscriptions = await queryRows<RowDataPacket & {
      id: string
      endpoint: string
      p256dh: string
      auth: string
    }>(
      `
        SELECT DISTINCT
          ps.id,
          ps.endpoint,
          ps.p256dh,
          ps.auth
        FROM push_subscriptions AS ps
        INNER JOIN users AS u ON u.id = ps.user_id
        INNER JOIN user_role_assignments AS ura ON ura.user_id = u.id
        INNER JOIN user_preferences AS up ON up.user_id = u.id
        WHERE ps.is_active = 1
          AND u.access_status = 'active'
          AND ura.role = 'faculty'
          AND up.push_notifications = 1
          AND up.system_updates = 1
      `
    )

    const broadcastId = randomUUID()
    await execute(
      `
        INSERT INTO admin_broadcasts (
          id,
          title,
          message,
          created_by_user_id,
          target_count
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        broadcastId,
        payload.title.trim(),
        payload.message.trim(),
        createdByUserId,
        subscriptions.length,
      ]
    )

    await NotificationService.createFacultyBroadcastNotifications({
      title: payload.title.trim(),
      message: payload.message.trim(),
      createdByUserId,
    })

    if (subscriptions.length > 0) {
      const invalidSubscriptionIds: string[] = []
      const results = await Promise.all(
        subscriptions.map(async (subscription) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth,
                },
              },
              JSON.stringify({
                title: payload.title.trim(),
                body: payload.message.trim(),
                url: '/faculty/notifications',
                tag: `admin-broadcast-${broadcastId}`,
              })
            )

            return true
          } catch (error) {
            if (isInvalidSubscriptionError(error)) {
              invalidSubscriptionIds.push(subscription.id)
            }

            return false
          }
        })
      )

      if (invalidSubscriptionIds.length > 0) {
        await execute(
          `
            UPDATE push_subscriptions
            SET is_active = 0
            WHERE id IN (${invalidSubscriptionIds.map(() => '?').join(', ')})
          `,
          invalidSubscriptionIds
        )
      }

      const successCount = results.filter(Boolean).length
      await execute(
        `
          UPDATE admin_broadcasts
          SET success_count = ?, failure_count = ?
          WHERE id = ?
        `,
        [successCount, results.length - successCount, broadcastId]
      )
    }

    const broadcast = await queryOne<RowDataPacket & {
      id: string
      title: string
      message: string
      targetCount: number
      successCount: number
      failureCount: number
      createdByUserId: string
      createdAt: Date | string
      createdByName: string
    }>(
      `
        SELECT
          b.id,
          b.title,
          b.message,
          b.target_count AS targetCount,
          b.success_count AS successCount,
          b.failure_count AS failureCount,
          b.created_by_user_id AS createdByUserId,
          b.created_at AS createdAt,
          u.name AS createdByName
        FROM admin_broadcasts AS b
        INNER JOIN users AS u ON u.id = b.created_by_user_id
        WHERE b.id = ?
        LIMIT 1
      `,
      [broadcastId]
    )

    if (!broadcast) {
      throw new Error('Broadcast was not saved.')
    }

    return mapAdminBroadcast(broadcast)
  },
}
