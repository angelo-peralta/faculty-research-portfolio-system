import 'server-only'

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, normalize } from 'node:path'
import { buildFacultyAssetPath, type FacultyAssetKind } from '@/lib/faculty-assets'
import { validateFacultyAssetFile } from '@/lib/server/faculty-asset-validation'

const PUBLIC_UPLOAD_ROOT = join(process.cwd(), 'public', 'uploads', 'faculty-assets')
const PUBLIC_UPLOAD_BASE_URL = '/uploads/faculty-assets'

function resolveAssetPath(path: string) {
  const normalizedPath = normalize(path).replace(/^(\.\.(\\|\/|$))+/, '')
  const resolvedPath = join(PUBLIC_UPLOAD_ROOT, normalizedPath)

  if (!resolvedPath.startsWith(PUBLIC_UPLOAD_ROOT)) {
    throw new Error('Invalid faculty asset path.')
  }

  return resolvedPath
}

export async function uploadFacultyAssetToLocalStorage(userId: string, kind: FacultyAssetKind, file: File) {
  const { contentType } = await validateFacultyAssetFile(kind, file)
  const path = buildFacultyAssetPath(userId, kind, file.name)
  const destination = resolveAssetPath(path)
  const bytes = new Uint8Array(await file.arrayBuffer())

  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, bytes)

  return {
    path,
    contentType,
  }
}

export async function removeLocalFacultyAsset(path: string | null | undefined) {
  if (!path) {
    return
  }

  await rm(resolveAssetPath(path), { force: true }).catch((error: unknown) => {
    console.error('Failed to delete local faculty asset:', error)
  })
}

export function getLocalFacultyAssetUrl(path: string | null | undefined) {
  if (!path) {
    return null
  }

  return `${PUBLIC_UPLOAD_BASE_URL}/${path.split('/').map(encodeURIComponent).join('/')}`
}
