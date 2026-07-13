import { redirect } from 'next/navigation'
import { AppProviders } from '@/components/providers/app-providers'
import { FacultyShell } from '@/app/faculty/faculty-shell'
import { ApiAuthError, getCurrentAppUser } from '@/lib/server/auth'
import { FacultySettingsService } from '@/lib/server/faculty-settings'
import { queryKeys } from '@/lib/query/query-keys'
import { createServerQueryClient, ServerHydrationBoundary } from '@/lib/server/query-hydration'
import { createInitialSession } from '@/lib/server/session'

const emptyNotificationPreview = {
  items: [],
  unread_count: 0,
}

export default async function FacultyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user

  try {
    ;({ user } = await getCurrentAppUser())
  } catch (error) {
    if (error instanceof ApiAuthError) {
      redirect('/login')
    }

    throw error
  }

  const session = await createInitialSession(user)

  if (!session.user.roles.includes('faculty') || session.activeRole !== 'faculty') {
    redirect('/admin/dashboard')
  }

  const preferences = await FacultySettingsService.getMyPreferences(user.id)
  const queryClient = createServerQueryClient()

  queryClient.setQueryData(queryKeys.faculty.workspace(), {
    preferences,
    notificationPreview: emptyNotificationPreview,
    prompt_needed: !preferences.initial_prompt_seen_at,
  })

  return (
    <AppProviders initialSession={session}>
      <ServerHydrationBoundary queryClient={queryClient}>
        <FacultyShell>{children}</FacultyShell>
      </ServerHydrationBoundary>
    </AppProviders>
  )
}
