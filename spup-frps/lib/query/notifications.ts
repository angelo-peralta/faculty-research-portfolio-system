import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminService } from '@/lib/services/admin-service'
import { ProfileService } from '@/lib/services/profile-service'
import { queryKeys } from '@/lib/query/query-keys'
import {
  setAdminWorkspaceNotificationPreview,
  setFacultyWorkspaceNotificationPreview,
} from '@/lib/query/workspace'
import type {
  NotificationListResponse,
  NotificationReadPayload,
  NotificationReadResult,
} from '@/lib/types'

const NOTIFICATION_LIST_STALE_TIME = 15_000
const NOTIFICATION_LIST_INTERVAL = 60_000

type NotificationScope = 'faculty' | 'admin'

function applyReadPayload(
  current: NotificationListResponse,
  payload: NotificationReadPayload,
  unreadCount: number
): NotificationListResponse {
  const timestamp = new Date().toISOString()

  return {
    unread_count: unreadCount,
    items: current.items.map((item) => {
      const shouldMarkRead = payload.markAll || (payload.ids?.includes(item.id) ?? false)

      if (!shouldMarkRead || item.read_at) {
        return item
      }

      return {
        ...item,
        read_at: timestamp,
      }
    }),
  }
}

function patchNotificationCaches(
  scope: NotificationScope,
  queryClient: ReturnType<typeof useQueryClient>,
  payload: NotificationReadPayload,
  result: NotificationReadResult
) {
  const notificationsRootKey =
    scope === 'faculty' ? queryKeys.faculty.notificationsRoot() : queryKeys.admin.notificationsRoot()

  queryClient.setQueriesData<NotificationListResponse>({ queryKey: notificationsRootKey }, (current) =>
    current ? applyReadPayload(current, payload, result.unread_count) : current
  )

  if (scope === 'faculty') {
    setFacultyWorkspaceNotificationPreview(queryClient, (current) =>
      applyReadPayload(current, payload, result.unread_count)
    )
  } else {
    setAdminWorkspaceNotificationPreview(queryClient, (current) =>
      applyReadPayload(current, payload, result.unread_count)
    )
  }
}

export function useFacultyNotificationsQuery(options: {
  limit?: number
  unread_only?: boolean
  enabled?: boolean
} = {}) {
  return useQuery({
    queryKey: queryKeys.faculty.notifications(options),
    queryFn: () => ProfileService.getMyNotifications(options),
    enabled: options.enabled ?? true,
    staleTime: NOTIFICATION_LIST_STALE_TIME,
    refetchOnWindowFocus: true,
    refetchInterval: NOTIFICATION_LIST_INTERVAL,
  })
}

export function useAdminNotificationsQuery(options: {
  limit?: number
  unread_only?: boolean
  enabled?: boolean
} = {}) {
  return useQuery({
    queryKey: queryKeys.admin.notifications(options),
    queryFn: () => AdminService.getNotifications(options),
    enabled: options.enabled ?? true,
    staleTime: NOTIFICATION_LIST_STALE_TIME,
    refetchOnWindowFocus: true,
    refetchInterval: NOTIFICATION_LIST_INTERVAL,
  })
}

export function useFacultyNotificationsReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: NotificationReadPayload) => ProfileService.markMyNotificationsRead(payload),
    onSuccess: (result, payload) => {
      patchNotificationCaches('faculty', queryClient, payload, result)
    },
  })
}

export function useAdminNotificationsReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: NotificationReadPayload) => AdminService.markNotificationsRead(payload),
    onSuccess: (result, payload) => {
      patchNotificationCaches('admin', queryClient, payload, result)
    },
  })
}
