'use client'

import { EducationFormFields } from '@/components/faculty/forms/education-form-fields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { DEPARTMENTS, EMPLOYMENT_STATUSES } from '@/lib/constants'
import type { Department, EducationPayload, EmploymentStatus } from '@/lib/types'

export interface ProfileCompletionDialogValue {
  department: Department | null
  employment_status: EmploymentStatus | null
  highestEducation: EducationPayload
}

interface ProfileCompletionDialogProps {
  open: boolean
  educationRequired: boolean
  isSaving: boolean
  value: ProfileCompletionDialogValue
  onChange: (value: ProfileCompletionDialogValue) => void
  onSubmit: () => Promise<void> | void
}

export function ProfileCompletionDialog({
  open,
  educationRequired,
  isSaving,
  value,
  onChange,
  onSubmit,
}: ProfileCompletionDialogProps) {
  const isCompletingImportedEducation = Boolean(value.highestEducation.id)

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-h-[calc(100dvh-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-4 sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl sm:p-6"
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Complete Your Faculty Profile</DialogTitle>
          <DialogDescription>
            Add your department, employment status, and highest educational attainment before
            continuing. You can update the rest of your portfolio after this step.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-6 overflow-y-auto overscroll-contain py-2 pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="completion-department">
                Department <span className="text-destructive">*</span>
              </Label>
              <Select
                value={value.department ?? undefined}
                onValueChange={(nextValue) =>
                  onChange({
                    ...value,
                    department: nextValue as Department,
                  })
                }
              >
                <SelectTrigger id="completion-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((department) => (
                    <SelectItem key={department.value} value={department.value}>
                      {department.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="completion-employment-status">
                Employment Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={value.employment_status ?? undefined}
                onValueChange={(nextValue) =>
                  onChange({
                    ...value,
                    employment_status: nextValue as EmploymentStatus,
                  })
                }
              >
                <SelectTrigger id="completion-employment-status">
                  <SelectValue placeholder="Select employment status" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {educationRequired ? (
            <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-4">
              <div>
                <p className="font-medium text-foreground">Highest Educational Attainment</p>
                <p className="text-sm text-muted-foreground">
                  {isCompletingImportedEducation
                    ? 'Finish the imported education record so your profile is considered complete.'
                    : 'This creates your first education record. If your degree is not listed, type it directly in the degree field.'}
                </p>
              </div>
              <EducationFormFields
                value={value.highestEducation}
                onChange={(nextEducation) =>
                  onChange({
                    ...value,
                    highestEducation: nextEducation,
                  })
                }
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button
            onClick={() => void onSubmit()}
            disabled={isSaving}
            className="gradient-primary w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <Spinner className="mr-2" />
                Saving...
              </>
            ) : (
              'Save and Continue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
