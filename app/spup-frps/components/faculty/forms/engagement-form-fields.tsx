'use client'

import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ENGAGEMENT_TYPES } from '@/lib/constants'
import { validateEngagementCertificateFile } from '@/lib/engagement-utils'
import type { EngagementPayload } from '@/lib/types'

interface EngagementFormFieldsProps {
  formData: EngagementPayload
  setFormData: Dispatch<SetStateAction<EngagementPayload>>
  certificateFile: File | null
  setCertificateFile: Dispatch<SetStateAction<File | null>>
  existingCertificateUrl: string | null
  hasExistingCertificate?: boolean
  onViewExistingCertificate?: (() => void) | null
}

export function EngagementFormFields({
  formData,
  setFormData,
  certificateFile,
  setCertificateFile,
  existingCertificateUrl,
  hasExistingCertificate = false,
  onViewExistingCertificate = null,
}: EngagementFormFieldsProps) {
  const handleCertificateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null

    if (!nextFile) {
      setCertificateFile(null)
      return
    }

    const validationError = validateEngagementCertificateFile(nextFile)

    if (validationError) {
      event.target.value = ''
      setCertificateFile(null)
      toast.error(validationError)
      return
    }

    setCertificateFile(nextFile)
  }

  return (
    <div className="space-y-5 py-2">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
          placeholder="Enter engagement title"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Engagement Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) =>
              setFormData((current) => ({
                ...current,
                type: value as EngagementPayload['type'],
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENGAGEMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData((current) => ({
                ...current,
                status: value as EngagementPayload['status'],
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="organization">Organization</Label>
        <Input
          id="organization"
          value={formData.organization}
          onChange={(event) => setFormData((current) => ({ ...current, organization: event.target.value }))}
          placeholder="Enter organization or partner"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="date"
            value={formData.startDate}
            onChange={(event) => setFormData((current) => ({ ...current, startDate: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            id="end-date"
            type="date"
            value={formData.endDate ?? ''}
            onChange={(event) => setFormData((current) => ({ ...current, endDate: event.target.value }))}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="beneficiaries">Beneficiaries</Label>
          <Input
            id="beneficiaries"
            type="number"
            min={0}
            value={formData.beneficiaries ?? 0}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                beneficiaries: Number(event.target.value) || 0,
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="certificate">Certificate</Label>
          <Input
            id="certificate"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleCertificateChange}
          />
          {certificateFile && <p className="text-xs text-muted-foreground">{certificateFile.name}</p>}
          {!certificateFile && existingCertificateUrl && (
            <a
              href={existingCertificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline"
            >
              View current certificate
            </a>
          )}
          {!certificateFile && !existingCertificateUrl && onViewExistingCertificate ? (
            <button
              type="button"
              onClick={onViewExistingCertificate}
              className="text-left text-xs text-primary underline"
            >
              View current certificate
            </button>
          ) : null}
          {!certificateFile && !existingCertificateUrl && !onViewExistingCertificate && hasExistingCertificate ? (
            <p className="text-xs text-muted-foreground">
              A certificate is already attached, but the preview link is temporarily unavailable.
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          value={formData.description ?? ''}
          onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
          placeholder="Describe the engagement"
        />
      </div>
    </div>
  )
}
