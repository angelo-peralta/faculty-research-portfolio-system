'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { WorkspaceLoadingState } from '@/components/admin/admin-loading-state'
import { InitialPreferencesDialog } from '@/components/faculty/initial-preferences-dialog'
import { FacultySidebar } from '@/components/layout/faculty-sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { InstallBanner } from '@/components/pwa/install-banner'
import { usePwa } from '@/components/pwa/pwa-provider'
import { useAuth } from '@/lib/auth-context'
import { getSignedOutEntryPath } from '@/lib/pwa/navigation'
import {
  setFacultyWorkspacePreferences,
  useFacultyWorkspaceQuery,
} from '@/lib/query/workspace'
import { ProfileService } from '@/lib/services/profile-service'
import type { UserPreferences } from '@/lib/types'
import { cn } from '@/lib/utils'

const defaultPreferences: UserPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  deadlineReminders: true,
  systemUpdates: false,
  initial_prompt_seen_at: null,
  created_at: '',
  updated_at: '',
}

type PreferenceKey = keyof Pick<
  UserPreferences,
  'emailNotifications' | 'pushNotifications' | 'deadlineReminders' | 'systemUpdates'
>

export function FacultyShell({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { user, activeRole, isLoading } = useAuth()
  const { hasResolvedDisplayMode, isInstalled } = usePwa()
  const facultyWorkspaceQuery = useFacultyWorkspaceQuery(
    Boolean(!isLoading && user && activeRole === 'faculty')
  )
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [isPreferencePromptOpen, setIsPreferencePromptOpen] = useState(false)
  const [isPromptSubmitting, setIsPromptSubmitting] = useState(false)
  const [hasInitializedPromptState, setHasInitializedPromptState] = useState(false)

  useEffect(() => {
    if (!isLoading && !user && hasResolvedDisplayMode) {
      router.replace(
        getSignedOutEntryPath({
          hasResolvedDisplayMode,
          isInstalled,
        })
      )
    } else if (!isLoading && user && activeRole !== 'faculty') {
      router.replace('/admin/dashboard')
    }
  }, [user, activeRole, hasResolvedDisplayMode, isInstalled, isLoading, router])

  useEffect(() => {
    if (isLoading || !user || activeRole !== 'faculty' || !facultyWorkspaceQuery.data) {
      return
    }

    if (!hasInitializedPromptState || !isPreferencePromptOpen) {
      setPreferences(facultyWorkspaceQuery.data.preferences)
    }

    setIsPreferencePromptOpen(facultyWorkspaceQuery.data.prompt_needed)
    setHasInitializedPromptState(true)
  }, [
    activeRole,
    facultyWorkspaceQuery.data,
    hasInitializedPromptState,
    isLoading,
    isPreferencePromptOpen,
    user,
  ])

  const handlePreferenceToggle = (key: PreferenceKey, checked: boolean) => {
    setPreferences((current) => ({
      ...current,
      [key]: checked,
    }))
  }

  const markInitialPromptSeen = async (useCurrentDefaults: boolean) => {
    setIsPromptSubmitting(true)

    try {
      const nextPreferences = await ProfileService.updateMyPreferences(
        useCurrentDefaults
          ? { markInitialPromptSeen: true }
          : {
              emailNotifications: preferences.emailNotifications,
              pushNotifications: preferences.pushNotifications,
              deadlineReminders: preferences.deadlineReminders,
              systemUpdates: preferences.systemUpdates,
              markInitialPromptSeen: true,
            }
      )

      setFacultyWorkspacePreferences(queryClient, nextPreferences)
      setPreferences(nextPreferences)
      setIsPreferencePromptOpen(false)
      toast.success(useCurrentDefaults ? 'Default preferences kept.' : 'Preferences saved.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save your preferences.')
    } finally {
      setIsPromptSubmitting(false)
    }
  }

  if (isLoading) {
    return <WorkspaceLoadingState fullscreen />
  }

  if (!user || activeRole !== 'faculty') {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <InitialPreferencesDialog
        open={isPreferencePromptOpen}
        preferences={preferences}
        isSubmitting={isPromptSubmitting}
        onToggle={handlePreferenceToggle}
        onSave={() => void markInitialPromptSeen(false)}
        onUseDefaults={() => void markInitialPromptSeen(true)}
      />

      <div className="hidden lg:block">
        <FacultySidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      <main
        className={cn(
          'min-h-screen transition-all duration-300 pb-20 lg:pb-0',
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        )}
      >
        {children}
      </main>

      <MobileNav />
      <InstallBanner className="fixed inset-x-3 bottom-20 z-40 shadow-2xl lg:hidden" />
    </div>
  )
}
