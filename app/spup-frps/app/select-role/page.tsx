'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppProviders } from '@/components/providers/app-providers'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/lib/auth-context'

function SelectRoleContent() {
  const router = useRouter()
  const { user, isLoading, switchRole } = useAuth()

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!user) {
      router.replace('/login')
      return
    }

    const redirectToWorkspace = async () => {
      const adminRole = user.roles.includes('main-admin')
        ? 'main-admin'
        : user.roles.includes('secondary-admin')
          ? 'secondary-admin'
          : null

      if (adminRole) {
        await switchRole(adminRole)
        router.replace('/admin/dashboard')
        return
      }

      await switchRole('faculty')
      router.replace('/faculty/profile')
    }

    void redirectToWorkspace()
  }, [user, isLoading, router, switchRole])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="w-8 h-8 text-primary" />
        <p className="text-sm text-muted-foreground">Redirecting to your workspace...</p>
      </div>
    </div>
  )
}

export default function SelectRolePage() {
  return (
    <AppProviders>
      <SelectRoleContent />
    </AppProviders>
  )
}
