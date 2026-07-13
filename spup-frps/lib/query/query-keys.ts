import type {
  AdminDepartmentDetailQuery,
  AdminEngagementListQuery,
  AdminFacultyListQuery,
  AdminPublicationListQuery,
  AdminResearchListQuery,
  Department,
} from '@/lib/types'

type NotificationQueryOptions = {
  limit?: number
  unread_only?: boolean
}

export const queryKeys = {
  faculty: {
    workspace: () => ['faculty', 'workspace'] as const,
    notificationsRoot: () => ['faculty', 'notifications'] as const,
    notifications: (options: NotificationQueryOptions = {}) =>
      ['faculty', 'notifications', options.limit ?? null, options.unread_only ?? false] as const,
    bootstrap: () => ['faculty', 'bootstrap'] as const,
    profile: () => ['faculty', 'profile'] as const,
    completion: () => ['faculty', 'completion'] as const,
    education: () => ['faculty', 'education'] as const,
    publications: () => ['faculty', 'publications'] as const,
    engagements: () => ['faculty', 'engagements'] as const,
    research: () => ['faculty', 'research'] as const,
  },
  admin: {
    workspace: () => ['admin', 'workspace'] as const,
    notificationsRoot: () => ['admin', 'notifications'] as const,
    notifications: (options: NotificationQueryOptions = {}) =>
      ['admin', 'notifications', options.limit ?? null, options.unread_only ?? false] as const,
    settingsBootstrap: () => ['admin', 'settings-bootstrap'] as const,
    facultyList: (query: AdminFacultyListQuery = {}) => ['admin', 'faculty-list', query] as const,
    facultyDetail: (facultyId: string) => ['admin', 'faculty-detail', facultyId] as const,
    publications: (query: AdminPublicationListQuery = {}) => ['admin', 'publications', query] as const,
    engagements: (query: AdminEngagementListQuery = {}) => ['admin', 'engagements', query] as const,
    research: (query: AdminResearchListQuery = {}) => ['admin', 'research', query] as const,
    departmentDetail: (department: string, query: Omit<AdminDepartmentDetailQuery, 'department'> = {}) =>
      ['admin', 'department-detail', department, query] as const,
    dashboard: (department: Department | 'all' = 'all') => ['admin', 'dashboard', department] as const,
    analytics: () => ['admin', 'analytics'] as const,
    decisionSupport: () => ['admin', 'decision-support'] as const,
  },
} as const
