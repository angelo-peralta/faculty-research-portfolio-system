'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DEPARTMENTS, EMPLOYMENT_STATUSES } from '@/lib/constants'
import type { FacultyInvitePayload, FacultyInviteRecord, UserRole } from '@/lib/types'

type AccessLevel =
  | 'secondary-admin'
  | 'main-admin'
  | 'faculty'
  | 'faculty-secondary-admin'
  | 'faculty-main-admin'

const ROLE_PRESETS: Record<AccessLevel, UserRole[]> = {
  'secondary-admin': ['secondary-admin'],
  'main-admin': ['main-admin'],
  faculty: ['faculty'],
  'faculty-secondary-admin': ['faculty', 'secondary-admin'],
  'faculty-main-admin': ['faculty', 'main-admin'],
}

function getAccessLevel(roles: UserRole[] | undefined): AccessLevel {
  if (roles?.includes('main-admin')) {
    return roles.includes('faculty') ? 'faculty-main-admin' : 'main-admin'
  }

  if (roles?.includes('secondary-admin')) {
    return roles.includes('faculty') ? 'faculty-secondary-admin' : 'secondary-admin'
  }

  return 'faculty'
}

interface FacultyInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: FacultyInvitePayload) => Promise<void>
  initialInvite?: Partial<FacultyInviteRecord> | null
  isSaving?: boolean
  title: string
  description: string
  submitLabel: string
}

interface FacultyInviteFormState {
  email: string
  name: string
  department: string
  employmentStatus: string
  accessLevel: AccessLevel
}

function getInitialFormState(initialInvite?: Partial<FacultyInviteRecord> | null): FacultyInviteFormState {
  return {
    email: initialInvite?.email ?? '',
    name: initialInvite?.name ?? '',
    department: initialInvite?.department ?? 'none',
    employmentStatus: initialInvite?.employment_status ?? 'none',
    accessLevel: getAccessLevel(initialInvite?.roles),
  }
}

function FacultyInviteDialogForm({
  initialInvite,
  isSaving,
  onOpenChange,
  onSubmit,
  submitLabel,
}: Pick<FacultyInviteDialogProps, 'initialInvite' | 'isSaving' | 'onOpenChange' | 'onSubmit' | 'submitLabel'>) {
  const initialState = getInitialFormState(initialInvite)
  const [email, setEmail] = useState(initialState.email)
  const [name, setName] = useState(initialState.name)
  const [department, setDepartment] = useState(initialState.department)
  const [employmentStatus, setEmploymentStatus] = useState(initialState.employmentStatus)
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(initialState.accessLevel)
  const selectedRoles = ROLE_PRESETS[accessLevel]
  const includesFaculty = selectedRoles.includes('faculty')

  const payload = useMemo<FacultyInvitePayload>(
    () => ({
      email,
      name: name.trim() || undefined,
      department: !includesFaculty || department === 'none' ? null : (department as FacultyInvitePayload['department']),
      employment_status:
        !includesFaculty || employmentStatus === 'none'
          ? null
          : (employmentStatus as FacultyInvitePayload['employment_status']),
      roles: selectedRoles,
    }),
    [department, email, employmentStatus, includesFaculty, name, selectedRoles]
  )

  const handleSubmit = async () => {
    await onSubmit(payload)
    onOpenChange(false)
  }

  return (
    <>
      <div className="grid gap-4 py-2">
        <div className="grid gap-2">
          <Label htmlFor="faculty-invite-email">Email</Label>
          <Input
            id="faculty-invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="faculty@spup.edu.ph"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="faculty-invite-name">Name</Label>
          <Input
            id="faculty-invite-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Faculty member name"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Department</Label>
            <Select value={department} onValueChange={setDepartment} disabled={!includesFaculty}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {DEPARTMENTS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Employment Status</Label>
            <Select value={employmentStatus} onValueChange={setEmploymentStatus} disabled={!includesFaculty}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {EMPLOYMENT_STATUSES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Access Level</Label>
          <Select value={accessLevel} onValueChange={(value) => setAccessLevel(value as AccessLevel)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="secondary-admin">Secondary Admin Only</SelectItem>
              <SelectItem value="main-admin">Main Admin Only</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
              <SelectItem value="faculty-secondary-admin">Faculty + Secondary Admin</SelectItem>
              <SelectItem value="faculty-main-admin">Faculty + Main Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={isSaving || !email.trim()}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </>
  )
}

export function FacultyInviteDialog({
  open,
  onOpenChange,
  onSubmit,
  initialInvite,
  isSaving = false,
  title,
  description,
  submitLabel,
}: FacultyInviteDialogProps) {
  const formKey = `${initialInvite?.id ?? initialInvite?.email ?? 'new'}-${open ? 'open' : 'closed'}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <FacultyInviteDialogForm
          key={formKey}
          initialInvite={initialInvite}
          isSaving={isSaving}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
          submitLabel={submitLabel}
        />
      </DialogContent>
    </Dialog>
  )
}
