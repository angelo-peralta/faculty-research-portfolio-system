'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEGREE_SUGGESTIONS, YEARS } from '@/lib/constants'
import type { EducationPayload } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EducationFormFieldsProps {
  value: EducationPayload
  onChange: (value: EducationPayload) => void
}

export function EducationFormFields({ value, onChange }: EducationFormFieldsProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="degree">
          Degree <span className="text-destructive">*</span>
        </Label>
        <Input
          id="degree"
          list="degree-suggestions"
          value={value.degree}
          onChange={(event) => onChange({ ...value, degree: event.target.value })}
          placeholder="Select or enter your degree"
        />
        <datalist id="degree-suggestions">
          {DEGREE_SUGGESTIONS.map((degree) => (
            <option key={degree} value={degree} />
          ))}
        </datalist>
      </div>

      <div className="space-y-2">
        <Label htmlFor="field">
          Field of Study <span className="text-destructive">*</span>
        </Label>
        <Input
          id="field"
          value={value.field}
          onChange={(event) => onChange({ ...value, field: event.target.value })}
          placeholder="e.g., Computer Science, Nursing"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="institution">
          Institution <span className="text-destructive">*</span>
        </Label>
        <Input
          id="institution"
          value={value.institution}
          onChange={(event) => onChange({ ...value, institution: event.target.value })}
          placeholder="e.g., University of the Philippines"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="year">Year Completed</Label>
        <Select value={value.year.toString()} onValueChange={(nextValue) => onChange({ ...value, year: Number(nextValue) })}>
          <SelectTrigger>
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
