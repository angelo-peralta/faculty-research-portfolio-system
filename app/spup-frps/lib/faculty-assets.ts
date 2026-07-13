export type FacultyAssetKind =
  | 'profile-photo'
  | 'profile-banner'
  | 'engagement-certificate'
  | 'publication-proof'
  | 'research-paper'

export const FACULTY_ASSET_BUCKET = 'faculty-assets'

export function getFacultyAssetPrefix(kind: FacultyAssetKind) {
  switch (kind) {
    case 'profile-photo':
      return 'profile/photo'
    case 'profile-banner':
      return 'profile/banner'
    case 'engagement-certificate':
      return 'engagement-certificates'
    case 'publication-proof':
      return 'publication-proofs'
    case 'research-paper':
      return 'research-papers'
  }
}

function getSafeExtension(fileName: string) {
  const extension = fileName.includes('.') ? fileName.split('.').pop() : null
  const normalizedExtension = extension?.trim().toLowerCase().replace(/[^a-z0-9]/g, '')

  return normalizedExtension || 'bin'
}

export function buildFacultyAssetPath(userId: string, kind: FacultyAssetKind, fileName: string) {
  return `${userId}/${getFacultyAssetPrefix(kind)}/${globalThis.crypto.randomUUID()}.${getSafeExtension(fileName)}`
}
