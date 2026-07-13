import type { FacultyAssetKind } from '@/lib/faculty-assets'
import { uploadFacultyAssetToLocalStorage } from '@/lib/server/local-assets'

export async function uploadFacultyAssetAsAdmin(userId: string, kind: FacultyAssetKind, file: File) {
  const { path } = await uploadFacultyAssetToLocalStorage(userId, kind, file)
  return path
}
