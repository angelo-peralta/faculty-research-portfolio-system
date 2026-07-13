import type { User, UserRole } from '@/lib/types'

export async function ensureWorkspaceRole(
  user: User,
  switchRole: (role: UserRole) => Promise<void>
) {
  const adminRole = user.roles.includes('main-admin')
    ? 'main-admin'
    : user.roles.includes('secondary-admin')
      ? 'secondary-admin'
      : null

  if (adminRole) {
    await switchRole(adminRole)
    return '/admin/dashboard'
  }

  await switchRole('faculty')
  return '/faculty/profile'
}
