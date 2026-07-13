import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { AdminService } from '@/lib/services/admin-service'
import { ProfileService } from '@/lib/services/profile-service'
import type {
  AdminWorkspaceBootstrapData,
  FacultyWorkspaceBootstrapData,
  NotificationListResponse,
  UserPreferences,
} from '@/lib/types'
import { queryKeys } from '@/lib/query/query-keys'

const WORKSPACE_STALE_TIME = 300_000

function updateNotificationPreview(
  preview: NotificationListResponse | undefined,
  updater: (current: NotificationListResponse) => NotificationListResponse
) {
  if (!preview) {
    return preview
  }

  return updater(preview)
}

export function useFacultyWorkspaceQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.faculty.workspace(),
    queryFn: () => ProfileService.getMyWorkspace(),
    enabled,
    staleTime: WORKSPACE_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}

export function useAdminWorkspaceQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.workspace(),
    queryFn: () => AdminService.getWorkspace(),
    enabled,
    staleTime: WORKSPACE_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}

export function setFacultyWorkspacePreferences(
  queryClient: QueryClient,
  preferences: UserPreferences
) {
  queryClient.setQueryData<FacultyWorkspaceBootstrapData>(
    queryKeys.faculty.workspace(),
    (current) =>
      current
        ? {
            ...current,
            preferences,
            prompt_needed: !preferences.initial_prompt_seen_at,
          }
        : current
  )
}

export function setFacultyWorkspaceNotificationPreview(
  queryClient: QueryClient,
  updater: (current: NotificationListResponse) => NotificationListResponse
) {
  queryClient.setQueryData<FacultyWorkspaceBootstrapData>(
    queryKeys.faculty.workspace(),
    (current) =>
      current
        ? {
            ...current,
            notificationPreview: updateNotificationPreview(current.notificationPreview, updater)!,
          }
        : current
  )
}

export function setAdminWorkspaceNotificationPreview(
  queryClient: QueryClient,
  updater: (current: NotificationListResponse) => NotificationListResponse
) {
  queryClient.setQueryData<AdminWorkspaceBootstrapData>(
    queryKeys.admin.workspace(),
    (current) =>
      current
        ? {
            ...current,
            notificationPreview: updateNotificationPreview(current.notificationPreview, updater)!,
          }
        : current
  )
}

export function useWorkspaceQueryClient() {
  return useQueryClient()
}
