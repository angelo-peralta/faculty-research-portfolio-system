import type {
  AccessStatus,
  DecisionSupportConfig,
  AdminDecisionSupportPageData,
  AdminAnalyticsSummary,
  AdminBroadcastPayload,
  AdminBroadcastRecord,
  AdminDepartmentDetailQuery,
  AdminDepartmentDetailResponse,
  AdminDashboardData,
  AdminDepartmentPerformanceItem,
  AdminEngagementListQuery,
  AdminEngagementListResponse,
  AdminFacultyDetail,
  AdminFacultyListQuery,
  AdminFacultyListResponse,
  AdminPublicationListQuery,
  AdminPublicationListResponse,
  AdminResearchListQuery,
  AdminResearchListResponse,
  AdminSettingsBootstrapData,
  AdminWorkspaceBootstrapData,
  AdminUserListItem,
  Department,
  EducationEntry,
  EducationPayload,
  Engagement,
  EngagementPayload,
  NotificationListResponse,
  NotificationReadPayload,
  NotificationReadResult,
  FacultyInvitePayload,
  FacultyInviteRecord,
  ProfileUpdatePayload,
  Publication,
  PublicationPayload,
  ResearchTitle,
  ResearchTitlePayload,
  UserRole,
} from '@/lib/types'

async function fetchJson<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${response.status}`)
  }

  if (response.status === 204) {
    return null as T
  }

  return response.json() as Promise<T>
}

async function downloadFile(path: string) {
  const response = await fetch(path, {
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${response.status}`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const disposition = response.headers.get('content-disposition')
  const filenameMatch = disposition?.match(/filename="(.+?)"/)
  const filename = filenameMatch?.[1] ?? 'export.csv'

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function createMultipartBody(payload: unknown, fileFieldName: string, file: File) {
  const body = new FormData()
  body.set('payload', JSON.stringify(payload))
  body.set(fileFieldName, file)
  return body
}

function buildQueryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'all') {
      continue
    }

    searchParams.set(key, String(value))
  }

  return searchParams.size > 0 ? `?${searchParams.toString()}` : ''
}

export const AdminService = {
  async getSignedAssetUrl(args: {
    facultyId: string
    kind: 'banner' | 'publication-proof' | 'engagement-certificate' | 'research-paper'
    id?: string
  }): Promise<string> {
    const params = new URLSearchParams({
      facultyId: args.facultyId,
      kind: args.kind,
    })

    if (args.id) {
      params.set('id', args.id)
    }

    const result = await fetchJson<{ url: string }>(`/api/admin/assets/sign?${params.toString()}`)
    return result.url
  },

  getWorkspace() {
    return fetchJson<AdminWorkspaceBootstrapData>('/api/admin/workspace')
  },

  getDashboardData(options?: {
    department?: Department | 'all'
  }) {
    return fetchJson<AdminDashboardData>(
      `/api/admin/dashboard${buildQueryString({
        department: options?.department,
      })}`
    )
  },

  getSettingsBootstrap() {
    return fetchJson<AdminSettingsBootstrapData>('/api/admin/settings/bootstrap')
  },

  listFaculty(query: AdminFacultyListQuery = {}) {
    return fetchJson<AdminFacultyListResponse>(
      `/api/admin/faculty${buildQueryString({
        search: query.search,
        department: query.department,
        status: query.status,
        page: query.page,
        page_size: query.page_size,
      })}`
    )
  },

  createFacultyInvite(payload: FacultyInvitePayload) {
    return fetchJson<FacultyInviteRecord>('/api/admin/faculty', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  },

  updateInvite(inviteId: string, payload: FacultyInvitePayload) {
    return fetchJson<FacultyInviteRecord>(`/api/admin/invites/${inviteId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  },

  cancelInvite(inviteId: string) {
    return fetchJson<{ success: true }>(`/api/admin/invites/${inviteId}`, {
      method: 'DELETE',
    })
  },

  listInvites() {
    return fetchJson<FacultyInviteRecord[]>('/api/admin/invites')
  },

  getFacultyProfile(userId: string) {
    return fetchJson<AdminFacultyDetail>(`/api/admin/faculty/${userId}`)
  },

  updateFacultyProfile(userId: string, payload: ProfileUpdatePayload) {
    return fetchJson<AdminFacultyDetail["profile"]>(`/api/admin/faculty/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  },

  setFacultyAccessStatus(userId: string, accessStatus: AccessStatus) {
    return fetchJson<AdminUserListItem>(`/api/admin/faculty/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_status: accessStatus,
      }),
    })
  },

  deactivateFacultyProfile(userId: string) {
    return fetchJson<AdminUserListItem>(`/api/admin/faculty/${userId}`, {
      method: 'DELETE',
    })
  },

  listAdmins() {
    return fetchJson<AdminUserListItem[]>('/api/admin/admin-users')
  },

  upsertAdmin(payload: {
    email: string
    role: Extract<UserRole, 'main-admin' | 'secondary-admin'>
    includeFaculty?: boolean
  }) {
    return fetchJson<AdminUserListItem | FacultyInviteRecord>('/api/admin/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  },

  updateAdmin(
    userId: string,
    role: Extract<UserRole, 'main-admin' | 'secondary-admin'>,
    options?: {
      includeFaculty?: boolean
    }
  ) {
    return fetchJson<AdminUserListItem>(`/api/admin/admin-users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role, includeFaculty: options?.includeFaculty }),
    })
  },

  deleteAdmin(userId: string) {
    return fetchJson<AdminUserListItem>(`/api/admin/admin-users/${userId}`, {
      method: 'DELETE',
    })
  },

  getFacultyEducation(userId: string) {
    return fetchJson<EducationEntry[]>(`/api/admin/faculty/${userId}/education`)
  },

  saveFacultyEducation(userId: string, payload: EducationPayload) {
    return fetchJson<EducationEntry>(`/api/admin/faculty/${userId}/education`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  },

  deleteFacultyEducation(userId: string, entryId: string) {
    return fetchJson<{ success: true }>(`/api/admin/faculty/${userId}/education/${entryId}`, {
      method: 'DELETE',
    })
  },

  saveFacultyPublication(userId: string, payload: PublicationPayload, proofFile?: File | null) {
    return fetchJson<Publication>(`/api/admin/faculty/${userId}/publications`, {
      method: 'POST',
      ...(proofFile
        ? {
            body: createMultipartBody(payload, 'proof', proofFile),
          }
        : {
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }),
    })
  },

  deleteFacultyPublication(userId: string, publicationId: string) {
    return fetchJson<{ success: true }>(`/api/admin/faculty/${userId}/publications/${publicationId}`, {
      method: 'DELETE',
    })
  },

  saveFacultyEngagement(userId: string, payload: EngagementPayload, certificateFile?: File | null) {
    return fetchJson<Engagement>(`/api/admin/faculty/${userId}/engagements`, {
      method: 'POST',
      ...(certificateFile
        ? {
            body: createMultipartBody(payload, 'certificate', certificateFile),
          }
        : {
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }),
    })
  },

  deleteFacultyEngagement(userId: string, engagementId: string) {
    return fetchJson<{ success: true }>(`/api/admin/faculty/${userId}/engagements/${engagementId}`, {
      method: 'DELETE',
    })
  },

  saveFacultyResearch(userId: string, payload: ResearchTitlePayload, paperFile?: File | null) {
    return fetchJson<ResearchTitle>(`/api/admin/faculty/${userId}/research`, {
      method: 'POST',
      ...(paperFile
        ? {
            body: createMultipartBody(payload, 'paper', paperFile),
          }
        : {
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }),
    })
  },

  deleteFacultyResearch(userId: string, researchTitleId: string) {
    return fetchJson<{ success: true }>(`/api/admin/faculty/${userId}/research/${researchTitleId}`, {
      method: 'DELETE',
    })
  },

  listPublications(query: AdminPublicationListQuery = {}) {
    return fetchJson<AdminPublicationListResponse>(
      `/api/admin/publications${buildQueryString({
        search: query.search,
        type: query.type,
        year: query.year,
        indexing: query.indexing,
        page: query.page,
        page_size: query.page_size,
      })}`
    )
  },

  listEngagements(query: AdminEngagementListQuery = {}) {
    return fetchJson<AdminEngagementListResponse>(
      `/api/admin/engagements${buildQueryString({
        search: query.search,
        type: query.type,
        status: query.status,
        page: query.page,
        page_size: query.page_size,
      })}`
    )
  },

  listResearchTitles(query: AdminResearchListQuery = {}) {
    return fetchJson<AdminResearchListResponse>(
      `/api/admin/research${buildQueryString({
        search: query.search,
        status: query.status,
        page: query.page,
        page_size: query.page_size,
      })}`
    )
  },

  listDepartments() {
    return fetchJson<AdminDepartmentPerformanceItem[]>('/api/admin/departments')
  },

  getDepartmentDetail(department: string, query: Omit<AdminDepartmentDetailQuery, 'department'> = {}) {
    return fetchJson<AdminDepartmentDetailResponse>(
      `/api/admin/departments/${department}${buildQueryString({
        search: query.search,
        status: query.status,
        page: query.page,
        page_size: query.page_size,
      })}`
    )
  },

  getAnalyticsSummary() {
    return fetchJson<AdminAnalyticsSummary>('/api/admin/analytics')
  },

  getDecisionSupport() {
    return fetchJson<AdminDecisionSupportPageData>('/api/admin/decision-support')
  },

  updateDecisionSupportConfig(payload: DecisionSupportConfig) {
    return fetchJson<DecisionSupportConfig>('/api/admin/settings/decision-support', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  },

  listBroadcasts() {
    return fetchJson<AdminBroadcastRecord[]>('/api/admin/broadcasts')
  },

  getNotifications(options?: {
    limit?: number
    unread_only?: boolean
  }) {
    return fetchJson<NotificationListResponse>(
      `/api/admin/notifications${buildQueryString({
        limit: options?.limit,
        unread_only: options?.unread_only ? 'true' : undefined,
      })}`
    )
  },

  markNotificationsRead(payload: NotificationReadPayload) {
    return fetchJson<NotificationReadResult>('/api/admin/notifications/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  },

  sendBroadcast(payload: AdminBroadcastPayload) {
    return fetchJson<AdminBroadcastRecord>('/api/admin/broadcasts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  },

  downloadExport(
    kind: 'faculty' | 'publications' | 'engagements' | 'research',
    options?: {
      department?: string
    }
  ) {
    const params = new URLSearchParams()

    if (options?.department) {
      params.set('department', options.department)
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ''
    return downloadFile(`/api/admin/exports/${kind}${suffix}`)
  },
}
