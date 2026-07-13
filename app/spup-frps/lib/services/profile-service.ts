import type {
  EducationEntry,
  EducationPayload,
  Engagement,
  EngagementPayload,
  FacultySearchResult,
  FacultyBootstrapData,
  FacultyWorkspaceBootstrapData,
  NotificationListResponse,
  NotificationReadPayload,
  NotificationReadResult,
  PushSubscriptionPayload,
  Profile,
  ProfileCompletionStatus,
  ProfileUpdatePayload,
  Publication,
  PublicationPayload,
  ResearchTitle,
  ResearchTitlePayload,
  UserPreferences,
  UserPreferencesPayload,
} from '@/lib/types'

async function request<T>(input: string, init?: RequestInit) {
  const isMultipart = init?.body instanceof FormData

  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${response.status}`)
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
  const filename = filenameMatch?.[1] ?? 'download'

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

export const ProfileService = {
  async getSignedAssetUrl(
    kind: 'banner' | 'publication-proof' | 'engagement-certificate' | 'research-paper',
    id?: string
  ): Promise<string> {
    const params = new URLSearchParams({ kind })

    if (id) {
      params.set('id', id)
    }

    const result = await request<{ url: string }>(`/api/me/assets/sign?${params.toString()}`)
    return result.url
  },

  async getMyWorkspace(): Promise<FacultyWorkspaceBootstrapData> {
    return request<FacultyWorkspaceBootstrapData>('/api/me/workspace')
  },

  async getMyBootstrap(): Promise<FacultyBootstrapData> {
    return request<FacultyBootstrapData>('/api/me/bootstrap')
  },

  async getMyProfile(): Promise<Profile> {
    return request<Profile>('/api/me/profile')
  },

  async updateMyProfile(payload: ProfileUpdatePayload): Promise<Profile> {
    return request<Profile>('/api/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async getProfileCompletion(): Promise<ProfileCompletionStatus> {
    return request<ProfileCompletionStatus>('/api/me/completion')
  },

  async getMyPreferences(): Promise<UserPreferences> {
    return request<UserPreferences>('/api/me/preferences')
  },

  async updateMyPreferences(payload: UserPreferencesPayload): Promise<UserPreferences> {
    return request<UserPreferences>('/api/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async upsertMyPushSubscription(payload: PushSubscriptionPayload): Promise<void> {
    await request<{ success: boolean }>('/api/me/push-subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async deleteMyPushSubscription(endpoint: string): Promise<boolean> {
    const result = await request<{ success: boolean }>('/api/me/push-subscriptions', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    })

    return result.success
  },

  async downloadMyJsonExport() {
    await downloadFile('/api/me/export/json')
  },

  async downloadMyCsvExport() {
    await downloadFile('/api/me/export/csv')
  },

  async getMyNotifications(options?: {
    limit?: number
    unread_only?: boolean
  }): Promise<NotificationListResponse> {
    const params = new URLSearchParams()

    if (options?.limit) {
      params.set('limit', String(options.limit))
    }

    if (options?.unread_only) {
      params.set('unread_only', 'true')
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : ''
    return request<NotificationListResponse>(`/api/me/notifications${suffix}`)
  },

  async markMyNotificationsRead(payload: NotificationReadPayload): Promise<NotificationReadResult> {
    return request<NotificationReadResult>('/api/me/notifications/read', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async listMyEducation(): Promise<EducationEntry[]> {
    return request<EducationEntry[]>('/api/me/education')
  },

  async upsertEducation(payload: EducationPayload): Promise<EducationEntry> {
    return request<EducationEntry>(payload.id ? `/api/me/education/${payload.id}` : '/api/me/education', {
      method: payload.id ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    })
  },

  async deleteEducation(entryId: string): Promise<boolean> {
    const result = await request<{ success: boolean }>(`/api/me/education/${entryId}`, {
      method: 'DELETE',
    })

    return result.success
  },

  async listMyPublications(): Promise<Publication[]> {
    return request<Publication[]>('/api/me/publications')
  },

  async searchFacultyCoAuthors(search: string, excludeUserId?: string | null): Promise<FacultySearchResult[]> {
    const params = new URLSearchParams({
      search,
    })

    if (excludeUserId) {
      params.set('exclude', excludeUserId)
    }

    return request<FacultySearchResult[]>(`/api/faculty/search?${params.toString()}`)
  },

  async upsertPublication(payload: PublicationPayload, proofFile?: File | null): Promise<Publication> {
    return request<Publication>(payload.id ? `/api/me/publications/${payload.id}` : '/api/me/publications', {
      method: payload.id ? 'PATCH' : 'POST',
      ...(proofFile
        ? {
            body: (() => {
              const body = new FormData()
              body.set('payload', JSON.stringify(payload))
              body.set('proof', proofFile)
              return body
            })(),
          }
        : {
            body: JSON.stringify(payload),
          }),
    })
  },

  async deletePublication(publicationId: string): Promise<boolean> {
    const result = await request<{ success: boolean }>(`/api/me/publications/${publicationId}`, {
      method: 'DELETE',
    })

    return result.success
  },

  async listMyEngagements(): Promise<Engagement[]> {
    return request<Engagement[]>('/api/me/engagements')
  },

  async upsertEngagement(payload: EngagementPayload, certificateFile?: File | null): Promise<Engagement> {
    return request<Engagement>(payload.id ? `/api/me/engagements/${payload.id}` : '/api/me/engagements', {
      method: payload.id ? 'PATCH' : 'POST',
      ...(certificateFile
        ? {
            body: createMultipartBody(payload, 'certificate', certificateFile),
          }
        : {
            body: JSON.stringify(payload),
          }),
    })
  },

  async deleteEngagement(engagementId: string): Promise<boolean> {
    const result = await request<{ success: boolean }>(`/api/me/engagements/${engagementId}`, {
      method: 'DELETE',
    })

    return result.success
  },

  async listMyResearchTitles(): Promise<ResearchTitle[]> {
    return request<ResearchTitle[]>('/api/me/research')
  },

  async upsertResearchTitle(payload: ResearchTitlePayload, paperFile?: File | null): Promise<ResearchTitle> {
    return request<ResearchTitle>(payload.id ? `/api/me/research/${payload.id}` : '/api/me/research', {
      method: payload.id ? 'PATCH' : 'POST',
      ...(paperFile
        ? {
            body: createMultipartBody(payload, 'paper', paperFile),
          }
        : {
            body: JSON.stringify(payload),
          }),
    })
  },

  async deleteResearchTitle(researchTitleId: string): Promise<boolean> {
    const result = await request<{ success: boolean }>(`/api/me/research/${researchTitleId}`, {
      method: 'DELETE',
    })

    return result.success
  },
}
