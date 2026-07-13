'use client'

import type { Dispatch, SetStateAction } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { RESEARCH_STATUS, SDG_OPTIONS } from '@/lib/constants'
import type { ResearchStatus, ResearchTitlePayload } from '@/lib/types'

interface ResearchFormFieldsProps {
  formData: ResearchTitlePayload
  setFormData: Dispatch<SetStateAction<ResearchTitlePayload>>
  paperFile: File | null
  setPaperFile: Dispatch<SetStateAction<File | null>>
  existingPaperUrl: string | null
  onViewExistingPaper?: (() => void) | null
}

export function ResearchFormFields({
  formData,
  setFormData,
  paperFile,
  setPaperFile,
  existingPaperUrl,
  onViewExistingPaper = null,
}: ResearchFormFieldsProps) {
  const researchersValue = formData.researchers.join(', ')

  const toggleSdg = (value: string) => {
    setFormData((current) => ({
      ...current,
      sdgGoals: current.sdgGoals?.includes(value)
        ? current.sdgGoals.filter((item) => item !== value)
        : [...(current.sdgGoals ?? []), value],
    }))
  }

  return (
    <div className="space-y-5 py-2">
      <div className="space-y-2">
        <Label htmlFor="title">Research Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
          placeholder="Enter research title"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData((current) => ({
                ...current,
                status: value as ResearchStatus,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESEARCH_STATUS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="progress">Progress</Label>
          <Input
            id="progress"
            type="number"
            min={0}
            max={100}
            value={formData.progress ?? 0}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                progress: Number(event.target.value) || 0,
              }))
            }
            disabled={formData.status !== 'ongoing'}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="researchers">Researchers</Label>
        <Input
          id="researchers"
          value={researchersValue}
          onChange={(event) =>
            setFormData((current) => ({
              ...current,
              researchers: event.target.value
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            }))
          }
          placeholder="Enter researchers separated by commas"
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
          <Label htmlFor="funding-source">Funding Source</Label>
          <Input
            id="funding-source"
            value={formData.fundingSource ?? ''}
            onChange={(event) => setFormData((current) => ({ ...current, fundingSource: event.target.value }))}
            placeholder="e.g. DOST, CHED"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="funding-amount">Funding Amount</Label>
          <Input
            id="funding-amount"
            type="number"
            min={0}
            value={formData.fundingAmount ?? 0}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                fundingAmount: Number(event.target.value) || 0,
              }))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paper">Paper Upload</Label>
        <Input
          id="paper"
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(event) => setPaperFile(event.target.files?.[0] ?? null)}
        />
        {paperFile && <p className="text-xs text-muted-foreground">{paperFile.name}</p>}
        {!paperFile && existingPaperUrl && (
          <a
            href={existingPaperUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline"
          >
            View current paper
          </a>
        )}
        {!paperFile && !existingPaperUrl && onViewExistingPaper ? (
          <button
            type="button"
            onClick={onViewExistingPaper}
            className="text-left text-xs text-primary underline"
          >
            View current paper
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          value={formData.description ?? ''}
          onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
          placeholder="Add context about the project"
        />
      </div>

      <div className="space-y-3">
        <Label>SDG Alignment</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {SDG_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                checked={formData.sdgGoals?.includes(option.value)}
                onCheckedChange={() => toggleSdg(option.value)}
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
