import { DEPARTMENTS } from '@/lib/constants'
import { queryOne, type RowDataPacket } from '@/lib/db/mysql'
import { unstable_cache } from 'next/cache'

export interface LandingStats {
  activeFacultyCount: number
  publicationsCount: number
  departmentsCount: number
}

const FALLBACK_LANDING_STATS: LandingStats = {
  activeFacultyCount: 0,
  publicationsCount: 0,
  departmentsCount: DEPARTMENTS.length,
}

async function loadLandingStats(): Promise<LandingStats> {
  const [facultyRow, publicationsRow] = await Promise.all([
    queryOne<RowDataPacket & { count: number }>(
      `
        SELECT COUNT(DISTINCT u.id) AS count
        FROM users AS u
        INNER JOIN user_role_assignments AS ura ON ura.user_id = u.id
        WHERE u.access_status = 'active'
          AND ura.role = 'faculty'
      `
    ),
    queryOne<RowDataPacket & { count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM publications AS p
        INNER JOIN users AS u ON u.id = p.user_id
        WHERE u.access_status = 'active'
      `
    ),
  ])

  return {
    activeFacultyCount: Number(facultyRow?.count ?? 0),
    publicationsCount: Number(publicationsRow?.count ?? 0),
    departmentsCount: DEPARTMENTS.length,
  }
}

function warnLandingStatsFallback(error: unknown) {
  console.warn('Failed to load landing stats. Using fallback values.', error)
}

export async function getLandingStats(): Promise<LandingStats> {
  try {
    return await loadLandingStats()
  } catch (error) {
    warnLandingStatsFallback(error)
    return FALLBACK_LANDING_STATS
  }
}

const getCachedLandingStatsFromDb = unstable_cache(
  loadLandingStats,
  ['landing-stats'],
  {
    revalidate: 300,
    tags: ['landing-stats'],
  }
)

export async function getCachedLandingStats(): Promise<LandingStats> {
  try {
    return await getCachedLandingStatsFromDb()
  } catch (error) {
    warnLandingStatsFallback(error)
    return FALLBACK_LANDING_STATS
  }
}
