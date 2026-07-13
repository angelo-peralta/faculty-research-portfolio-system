import packageMetadata from '@/package.json'

function normalizeEnvValue(value: string | undefined) {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : null
}

export const APP_NAME = 'SPUP Faculty Research Portfolio'
export const APP_SHORT_NAME = 'SPUP FRP'
export const APP_DESCRIPTION =
  'Research portfolio management system for SPUP faculty, publications, engagements, and academic reporting.'
export const APP_VERSION = normalizeEnvValue(process.env.NEXT_PUBLIC_APP_VERSION) ?? packageMetadata.version
export const APP_BUILD_ID = normalizeEnvValue(process.env.NEXT_PUBLIC_APP_BUILD_ID) ?? APP_VERSION
export const APP_DEVELOPER_NAME = 'Angelo Peralta'
export const APP_DEVELOPER_EMAIL = 'aperalta@spup.edu.ph'
export const APP_PUBLISHER = 'St. Paul University Philippines'
export const APP_THEME_COLOR = '#14622e'
export const APP_THEME_COLOR_DARK = '#101813'
export const APP_BACKGROUND_COLOR = '#f8f9fa'
export const APP_BACKGROUND_COLOR_DARK = '#101813'
