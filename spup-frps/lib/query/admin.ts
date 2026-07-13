import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AdminService } from '@/lib/services/admin-service'
import { queryKeys } from '@/lib/query/query-keys'
import type {
  AdminAnalyticsSummary,
  AdminDashboardData,
  AdminDepartmentDetailQuery,
  AdminEngagementListQuery,
  AdminFacultyListQuery,
  AdminPublicationListQuery,
  AdminResearchListQuery,
  Department,
} from '@/lib/types'

const ADMIN_STALE_TIME = 300_000
const ADMIN_SETTINGS_STALE_TIME = 60_000

export function useAdminSettingsBootstrapQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.settingsBootstrap(),
    queryFn: () => AdminService.getSettingsBootstrap(),
    enabled,
    staleTime: ADMIN_SETTINGS_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}

export function useAdminFacultyListQuery(query: AdminFacultyListQuery = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.facultyList(query),
    queryFn: () => AdminService.listFaculty(query),
    enabled,
    staleTime: ADMIN_STALE_TIME,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}

export function useAdminFacultyDetailQuery(facultyId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.facultyDetail(facultyId),
    queryFn: () => AdminService.getFacultyProfile(facultyId),
    enabled: enabled && Boolean(facultyId),
    staleTime: ADMIN_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}

export function useAdminPublicationsQuery(query: AdminPublicationListQuery = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.publications(query),
    queryFn: () => AdminService.listPublications(query),
    enabled,
    staleTime: ADMIN_STALE_TIME,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}

export function useAdminEngagementsQuery(query: AdminEngagementListQuery = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.engagements(query),
    queryFn: () => AdminService.listEngagements(query),
    enabled,
    staleTime: ADMIN_STALE_TIME,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}

export function useAdminResearchQuery(query: AdminResearchListQuery = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.research(query),
    queryFn: () => AdminService.listResearchTitles(query),
    enabled,
    staleTime: ADMIN_STALE_TIME,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}

export function useAdminDepartmentDetailQuery(
  department: string,
  query: Omit<AdminDepartmentDetailQuery, 'department'> = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.admin.departmentDetail(department, query),
    queryFn: () => AdminService.getDepartmentDetail(department, query),
    enabled: enabled && Boolean(department),
    staleTime: ADMIN_STALE_TIME,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}

export function useAdminDecisionSupportQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.decisionSupport(),
    queryFn: () => AdminService.getDecisionSupport(),
    enabled,
    staleTime: ADMIN_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}

export function useAdminDashboardQuery(
  department: Department | 'all' = 'all',
  enabled = true,
  initialData?: AdminDashboardData
) {
  return useQuery({
    queryKey: queryKeys.admin.dashboard(department),
    queryFn: () => AdminService.getDashboardData({ department }),
    enabled,
    initialData,
    staleTime: ADMIN_STALE_TIME,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}

export function useAdminAnalyticsQuery(enabled = true, initialData?: AdminAnalyticsSummary) {
  return useQuery({
    queryKey: queryKeys.admin.analytics(),
    queryFn: () => AdminService.getAnalyticsSummary(),
    enabled,
    initialData,
    staleTime: ADMIN_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}
