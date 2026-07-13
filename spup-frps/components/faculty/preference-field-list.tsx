'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { UserPreferences } from '@/lib/types'

type PreferenceKey = keyof Pick<
  UserPreferences,
  'emailNotifications' | 'pushNotifications' | 'deadlineReminders' | 'systemUpdates'
>

interface PreferenceFieldDefinition {
  key: PreferenceKey
  label: string
  description: string
}

export const FACULTY_PREFERENCE_FIELDS: PreferenceFieldDefinition[] = [
  {
    key: 'emailNotifications',
    label: 'Email Notifications',
    description: 'Saved now for upcoming email delivery channels.',
  },
  {
    key: 'pushNotifications',
    label: 'Push Notifications',
    description: 'Required for browser push delivery on this account.',
  },
  {
    key: 'deadlineReminders',
    label: 'Deadline Reminders',
    description: 'Saved now for upcoming reminder automation.',
  },
  {
    key: 'systemUpdates',
    label: 'System Updates',
    description: 'Enable admin broadcast announcements and system updates.',
  },
]

interface FacultyPreferenceFieldListProps {
  preferences: Pick<
    UserPreferences,
    'emailNotifications' | 'pushNotifications' | 'deadlineReminders' | 'systemUpdates'
  >
  disabledKey?: PreferenceKey | null
  disabled?: boolean
  onToggle: (key: PreferenceKey, checked: boolean) => void
}

export function FacultyPreferenceFieldList({
  preferences,
  disabledKey = null,
  disabled = false,
  onToggle,
}: FacultyPreferenceFieldListProps) {
  return (
    <div className="space-y-4">
      {FACULTY_PREFERENCE_FIELDS.map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label>{item.label}</Label>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
          <Switch
            checked={preferences[item.key]}
            disabled={disabled || disabledKey === item.key}
            onCheckedChange={(checked) => onToggle(item.key, checked)}
          />
        </div>
      ))}
    </div>
  )
}
