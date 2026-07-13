'use client'

import { Bell } from 'lucide-react'
import { FacultyPreferenceFieldList } from '@/components/faculty/preference-field-list'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { UserPreferences } from '@/lib/types'

type PreferenceKey = keyof Pick<
  UserPreferences,
  'emailNotifications' | 'pushNotifications' | 'deadlineReminders' | 'systemUpdates'
>

interface InitialPreferencesDialogProps {
  open: boolean
  preferences: Pick<
    UserPreferences,
    'emailNotifications' | 'pushNotifications' | 'deadlineReminders' | 'systemUpdates'
  >
  savingKey?: PreferenceKey | null
  isSubmitting?: boolean
  onToggle: (key: PreferenceKey, checked: boolean) => void
  onSave: () => void
  onUseDefaults: () => void
}

export function InitialPreferencesDialog({
  open,
  preferences,
  savingKey = null,
  isSubmitting = false,
  onToggle,
  onSave,
  onUseDefaults,
}: InitialPreferencesDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-xl"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <DialogTitle>Choose your delivery preferences</DialogTitle>
            <DialogDescription>
              Set your initial notification preferences now. You can update them anytime later in Settings.
            </DialogDescription>
          </div>
        </DialogHeader>

        <FacultyPreferenceFieldList
          preferences={preferences}
          disabledKey={savingKey}
          disabled={isSubmitting}
          onToggle={onToggle}
        />

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onUseDefaults}
            disabled={isSubmitting}
          >
            Use Current Defaults
          </Button>
          <Button type="button" onClick={onSave} disabled={isSubmitting}>
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
