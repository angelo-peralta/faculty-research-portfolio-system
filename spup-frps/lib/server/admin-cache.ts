import { unstable_cache } from 'next/cache'
import { AdminDataService } from '@/lib/server/admin-data'
import { DecisionSupportService } from '@/lib/server/decision-support'
import { PushBroadcastService } from '@/lib/server/push-broadcasts'
import type {
  AdminAnalyticsSummary,
  AdminDashboardData,
  AdminDepartmentPerformanceItem,
  AdminDecisionSupportPageData,
  AdminSettingsBootstrapData,
  Department,
} from '@/lib/types'

const ALL_DEPARTMENTS_CACHE_KEY = 'all'

function normalizeDepartmentKey(department?: Department) {
  return department ?? ALL_DEPARTMENTS_CACHE_KEY
}

function toDepartment(departmentKey: string) {
  return departmentKey === ALL_DEPARTMENTS_CACHE_KEY ? undefined : (departmentKey as Department)
}

const getCachedAdminDashboardByKey = unstable_cache(
  async (departmentKey: string): Promise<AdminDashboardData> => {
    const department = toDepartment(departmentKey)
    const [dashboard, decisionSupportSummary] = await Promise.all([
      AdminDataService.getDashboardData(department),
      DecisionSupportService.getSummary(department),
    ])

    return {
      ...dashboard,
      decisionSupportSummary,
    }
  },
  ['admin-dashboard-data'],
  {
    revalidate: 300,
    tags: ['admin-dashboard', 'decision-support'],
  }
)

export function getCachedAdminDashboardData(department?: Department) {
  return getCachedAdminDashboardByKey(normalizeDepartmentKey(department))
}

export const getCachedDecisionSupportPageData = unstable_cache(
  async (): Promise<AdminDecisionSupportPageData> => DecisionSupportService.getPageData(),
  ['decision-support-page-data'],
  {
    revalidate: 300,
    tags: ['decision-support'],
  }
)

export const getCachedAdminAnalyticsSummary = unstable_cache(
  async (): Promise<AdminAnalyticsSummary> => AdminDataService.getAnalyticsSummary(),
  ['admin-analytics-summary'],
  {
    revalidate: 300,
    tags: ['admin-analytics', 'admin-dashboard'],
  }
)

export const getCachedAdminDepartmentsSummary = unstable_cache(
  async (): Promise<AdminDepartmentPerformanceItem[]> => AdminDataService.getDepartmentsSummary(),
  ['admin-departments-summary'],
  {
    revalidate: 300,
    tags: ['admin-departments', 'admin-dashboard'],
  }
)

export const getCachedAdminSettingsBootstrap = unstable_cache(
  async (): Promise<AdminSettingsBootstrapData> => {
    const [adminUsers, invites, inactiveFacultyResponse, broadcasts, decisionSupportConfig] =
      await Promise.all([
        AdminDataService.listAdminUsers(),
        AdminDataService.listInvites(),
        AdminDataService.getFacultyListPage({
          status: 'inactive',
          page: 1,
          page_size: 500,
        }),
        PushBroadcastService.listBroadcasts(),
        DecisionSupportService.getConfig(),
      ])

    return {
      adminUsers,
      invites,
      inactiveFaculty: inactiveFacultyResponse.items,
      broadcasts,
      decisionSupportConfig,
      decisionSupportDefaults: DecisionSupportService.getDefaultConfig(),
    }
  },
  ['admin-settings-bootstrap'],
  {
    revalidate: 60,
    tags: ['admin-settings-bootstrap', 'admin-faculty', 'admin-invites', 'decision-support'],
  }
)
