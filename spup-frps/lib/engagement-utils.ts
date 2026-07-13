import type { EngagementPayload, EngagementStatus } from '@/lib/types'

const ENGAGEMENT_CERTIFICATE_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
])

const ENGAGEMENT_CERTIFICATE_ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png'])

export const ENGAGEMENT_CERTIFICATE_MAX_BYTES = 10 * 1024 * 1024

function getFileExtension(fileName: string) {
  return fileName.includes('.') ? fileName.split('.').pop()?.trim().toLowerCase() ?? '' : ''
}

export function validateEngagementCertificateFile(file: Pick<File, 'name' | 'size' | 'type'>) {
  const extension = getFileExtension(file.name)

  if (!ENGAGEMENT_CERTIFICATE_ALLOWED_EXTENSIONS.has(extension)) {
    return 'Certificate must be a PDF, JPG, or PNG file.'
  }

  if (file.type && !ENGAGEMENT_CERTIFICATE_ALLOWED_MIME_TYPES.has(file.type)) {
    return 'Certificate must be a PDF, JPG, or PNG file.'
  }

  if (file.size > ENGAGEMENT_CERTIFICATE_MAX_BYTES) {
    return 'Certificate must be 10 MB or smaller.'
  }

  return null
}

export function normalizeEngagementPayload(payload: EngagementPayload): EngagementPayload {
  const normalizedBeneficiaries = Number.isFinite(payload.beneficiaries)
    ? Math.max(0, Math.trunc(payload.beneficiaries ?? 0))
    : 0

  return {
    ...payload,
    title: payload.title.trim(),
    organization: payload.organization.trim(),
    startDate: payload.startDate.trim(),
    endDate: payload.endDate?.trim() ?? '',
    description: payload.description?.trim() ?? '',
    beneficiaries: normalizedBeneficiaries,
    certificate_path: payload.certificate_path?.trim() ? payload.certificate_path.trim() : null,
  }
}

export function hasEngagementCertificate(value: {
  certificate_path?: string | null
  certificate_url?: string | null
}) {
  return Boolean(value.certificate_path || value.certificate_url)
}

export function getEngagementStatusLabel(status: EngagementStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
