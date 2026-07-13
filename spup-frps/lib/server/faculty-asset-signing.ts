import { queryOne, type RowDataPacket } from '@/lib/db/mysql'
import { getLocalFacultyAssetUrl } from '@/lib/server/local-assets'

export type FacultyAssetSignKind =
  | 'banner'
  | 'publication-proof'
  | 'engagement-certificate'
  | 'research-paper'

function requireRecordId(kind: Exclude<FacultyAssetSignKind, 'banner'>, id: string | null | undefined) {
  const nextId = id?.trim()

  if (!nextId) {
    throw new Error(`Missing asset id for ${kind}.`)
  }

  return nextId
}

export function isFacultyAssetSignKind(value: string | null): value is FacultyAssetSignKind {
  return value === 'banner' ||
    value === 'publication-proof' ||
    value === 'engagement-certificate' ||
    value === 'research-paper'
}

export async function signFacultyAssetPath(path: string | null | undefined) {
  return getLocalFacultyAssetUrl(path)
}

export async function getFacultyAssetPathForUser(
  userId: string,
  kind: FacultyAssetSignKind,
  id?: string | null
) {
  if (kind === 'banner') {
    const profile = await queryOne<RowDataPacket & { bannerPath: string | null }>(
      'SELECT banner_path AS bannerPath FROM faculty_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    )

    return profile?.bannerPath ?? null
  }

  if (kind === 'publication-proof') {
    const publication = await queryOne<RowDataPacket & { proofPath: string | null }>(
      `
        SELECT p.proof_path AS proofPath
        FROM publications AS p
        LEFT JOIN publication_contributors AS pc
          ON pc.publication_id = p.id
          AND pc.user_id = ?
        WHERE p.id = ?
          AND (p.user_id = ? OR pc.user_id IS NOT NULL)
        LIMIT 1
      `,
      [userId, requireRecordId(kind, id), userId]
    )

    return publication?.proofPath ?? null
  }

  if (kind === 'engagement-certificate') {
    const engagement = await queryOne<RowDataPacket & { certificatePath: string | null }>(
      `
        SELECT certificate_path AS certificatePath
        FROM engagements
        WHERE id = ?
          AND user_id = ?
        LIMIT 1
      `,
      [requireRecordId(kind, id), userId]
    )

    return engagement?.certificatePath ?? null
  }

  const researchTitle = await queryOne<RowDataPacket & { paperPath: string | null }>(
    `
      SELECT paper_path AS paperPath
      FROM research_titles
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [requireRecordId(kind, id), userId]
  )

  return researchTitle?.paperPath ?? null
}
