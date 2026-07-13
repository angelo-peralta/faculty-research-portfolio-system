import type { FacultyAssetKind } from '@/lib/faculty-assets'
import { ApiClientError } from '@/lib/server/errors'

type FacultyAssetPolicy = {
  label: string
  maxBytes: number
  extensions: readonly string[]
  mimeTypes: readonly string[]
}

const MB = 1024 * 1024

const MIME_BY_EXTENSION: Record<string, string> = {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  pdf: 'application/pdf',
  png: 'image/png',
}

const FILE_SIGNATURES: Record<string, readonly number[][]> = {
  doc: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  docx: [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06],
    [0x50, 0x4b, 0x07, 0x08],
  ],
  jpeg: [[0xff, 0xd8, 0xff]],
  jpg: [[0xff, 0xd8, 0xff]],
  pdf: [[0x25, 0x50, 0x44, 0x46]],
  png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
}

const POLICIES: Record<FacultyAssetKind, FacultyAssetPolicy> = {
  'profile-photo': {
    label: 'Profile photo',
    maxBytes: 5 * MB,
    extensions: ['jpg', 'jpeg', 'png'],
    mimeTypes: ['application/octet-stream', 'image/jpeg', 'image/png'],
  },
  'profile-banner': {
    label: 'Profile banner',
    maxBytes: 8 * MB,
    extensions: ['jpg', 'jpeg', 'png'],
    mimeTypes: ['application/octet-stream', 'image/jpeg', 'image/png'],
  },
  'engagement-certificate': {
    label: 'Certificate',
    maxBytes: 10 * MB,
    extensions: ['pdf', 'jpg', 'jpeg', 'png'],
    mimeTypes: ['application/octet-stream', 'application/pdf', 'image/jpeg', 'image/png'],
  },
  'publication-proof': {
    label: 'Publication proof',
    maxBytes: 15 * MB,
    extensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
    mimeTypes: [
      'application/msword',
      'application/octet-stream',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'image/jpeg',
      'image/png',
    ],
  },
  'research-paper': {
    label: 'Research paper',
    maxBytes: 25 * MB,
    extensions: ['pdf', 'doc', 'docx'],
    mimeTypes: [
      'application/msword',
      'application/octet-stream',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
    ],
  },
}

function formatAllowedExtensions(extensions: readonly string[]) {
  return extensions.map((extension) => extension.toUpperCase()).join(', ')
}

function formatMaxBytes(bytes: number) {
  return `${Math.floor(bytes / MB)} MB`
}

function getFileExtension(fileName: string) {
  return fileName.includes('.') ? fileName.split('.').pop()?.trim().toLowerCase() ?? '' : ''
}

function startsWithSignature(bytes: Uint8Array, signature: readonly number[]) {
  if (bytes.length < signature.length) {
    return false
  }

  return signature.every((value, index) => bytes[index] === value)
}

async function hasExpectedSignature(file: File, extension: string) {
  const signatures = FILE_SIGNATURES[extension]

  if (!signatures) {
    return false
  }

  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  return signatures.some((signature) => startsWithSignature(header, signature))
}

export async function validateFacultyAssetFile(kind: FacultyAssetKind, file: File) {
  const policy = POLICIES[kind]
  const extension = getFileExtension(file.name)

  if (!extension || !policy.extensions.includes(extension)) {
    throw new ApiClientError(
      `${policy.label} must be a ${formatAllowedExtensions(policy.extensions)} file.`
    )
  }

  if (file.size <= 0) {
    throw new ApiClientError(`${policy.label} cannot be empty.`)
  }

  if (file.size > policy.maxBytes) {
    throw new ApiClientError(`${policy.label} must be ${formatMaxBytes(policy.maxBytes)} or smaller.`, 413)
  }

  if (file.type && !policy.mimeTypes.includes(file.type)) {
    throw new ApiClientError(
      `${policy.label} must be a ${formatAllowedExtensions(policy.extensions)} file.`
    )
  }

  if (!(await hasExpectedSignature(file, extension))) {
    throw new ApiClientError(`${policy.label} file contents do not match the selected file type.`)
  }

  return {
    contentType: file.type || MIME_BY_EXTENSION[extension] || 'application/octet-stream',
  }
}
