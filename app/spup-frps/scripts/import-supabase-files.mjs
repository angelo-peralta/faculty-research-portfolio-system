import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join, normalize, resolve, sep } from 'node:path'
import mysql from 'mysql2/promise'
import { loadProjectEnv, requireEnv } from './lib/env.mjs'

loadProjectEnv(process.cwd(), ['.env', '.env.local', '.env.import.local', '.env.supabase.local'])

const databaseUrl = requireEnv('DATABASE_URL')
const sourceUrl = getSourceEnv('SOURCE_SUPABASE_URL', [
  'NEXT_PUBLIC_SUPABASE_URL',
]).replace(/\/$/, '')
const sourceServiceRoleKey = getSourceEnv('SOURCE_SUPABASE_SERVICE_ROLE_KEY', [
  'SUPABASE_SERVICE_ROLE_KEY',
])
const bucket = process.env.SOURCE_SUPABASE_STORAGE_BUCKET?.trim() || 'faculty-assets'
const outputRoot = resolve(
  process.cwd(),
  process.env.FACULTY_ASSET_IMPORT_DIR?.trim() || 'public/uploads/faculty-assets'
)
const dryRun = process.argv.includes('--dry-run')
const force = process.argv.includes('--force')
const concurrency = getPositiveIntegerArg('--concurrency', 4)

function getSourceEnv(primaryName, fallbackNames) {
  for (const name of [primaryName, ...fallbackNames]) {
    const value = process.env[name]?.trim()

    if (value) {
      return value
    }
  }

  throw new Error(
    [
      `Missing required Supabase import variable: ${primaryName}.`,
      'Create .env.import.local with:',
      'SOURCE_SUPABASE_URL=https://your-project-ref.supabase.co',
      'SOURCE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key',
      '',
      `Fallback names accepted: ${fallbackNames.join(', ')}.`,
    ].join('\n')
  )
}

function getPositiveIntegerArg(name, fallback) {
  const prefix = `${name}=`
  const rawValue = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
  const value = Number(rawValue)

  return Number.isInteger(value) && value > 0 ? value : fallback
}

function normalizeStoragePath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    return null
  }

  let path = rawPath.trim()

  if (!path) {
    return null
  }

  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path)
    path = url.pathname
  }

  path = path.replace(/\\/g, '/')
  path = path.replace(/^\/+/, '')

  const knownPrefixes = [
    `storage/v1/object/public/${bucket}/`,
    `storage/v1/object/sign/${bucket}/`,
    `storage/v1/object/${bucket}/`,
    `uploads/faculty-assets/`,
    `${bucket}/`,
  ]

  for (const prefix of knownPrefixes) {
    if (path.startsWith(prefix)) {
      path = path.slice(prefix.length)
      break
    }
  }

  try {
    path = decodeURIComponent(path)
  } catch {
    // Keep the original path when it contains a literal percent sequence.
  }

  path = path.replace(/^\/+/, '')

  if (!path || path.includes('\0')) {
    return null
  }

  return path
}

function resolveOutputPath(storagePath) {
  const normalizedPath = normalize(storagePath).replace(/^(\.\.(\\|\/|$))+/, '')
  const destination = resolve(join(outputRoot, normalizedPath))
  const rootWithSeparator = outputRoot.endsWith(sep) ? outputRoot : `${outputRoot}${sep}`

  if (destination !== outputRoot && !destination.startsWith(rootWithSeparator)) {
    throw new Error(`Unsafe storage path: ${storagePath}`)
  }

  return destination
}

function encodeStoragePath(storagePath) {
  return storagePath.split('/').map(encodeURIComponent).join('/')
}

async function pathExists(path) {
  try {
    await stat(path)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false
    }

    throw error
  }
}

async function collectReferencedAssets(connection) {
  const [rows] = await connection.query(`
    SELECT 'faculty_profiles.photo_path' AS source, photo_path AS path
      FROM faculty_profiles
      WHERE photo_path IS NOT NULL AND photo_path <> ''
    UNION ALL
    SELECT 'faculty_profiles.banner_path' AS source, banner_path AS path
      FROM faculty_profiles
      WHERE banner_path IS NOT NULL AND banner_path <> ''
    UNION ALL
    SELECT 'publications.proof_path' AS source, proof_path AS path
      FROM publications
      WHERE proof_path IS NOT NULL AND proof_path <> ''
    UNION ALL
    SELECT 'engagements.certificate_path' AS source, certificate_path AS path
      FROM engagements
      WHERE certificate_path IS NOT NULL AND certificate_path <> ''
    UNION ALL
    SELECT 'research_titles.paper_path' AS source, paper_path AS path
      FROM research_titles
      WHERE paper_path IS NOT NULL AND paper_path <> ''
  `)

  const assets = new Map()

  for (const row of rows) {
    const storagePath = normalizeStoragePath(row.path)

    if (!storagePath) {
      continue
    }

    const asset = assets.get(storagePath) ?? {
      path: storagePath,
      references: 0,
      sources: new Set(),
    }

    asset.references += 1
    asset.sources.add(row.source)
    assets.set(storagePath, asset)
  }

  return [...assets.values()].map((asset) => ({
    ...asset,
    sources: [...asset.sources].sort(),
  }))
}

async function downloadAsset(asset) {
  const destination = resolveOutputPath(asset.path)

  if (!force && await pathExists(destination)) {
    return {
      path: asset.path,
      status: 'skipped-existing',
    }
  }

  if (dryRun) {
    return {
      path: asset.path,
      status: 'dry-run',
    }
  }

  const response = await fetch(
    `${sourceUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStoragePath(asset.path)}`,
    {
      headers: {
        apikey: sourceServiceRoleKey,
        Authorization: `Bearer ${sourceServiceRoleKey}`,
      },
    }
  )

  if (!response.ok) {
    return {
      path: asset.path,
      status: 'failed',
      error: `${response.status} ${response.statusText}`,
    }
  }

  const bytes = Buffer.from(await response.arrayBuffer())

  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, bytes)

  return {
    path: asset.path,
    status: 'downloaded',
    bytes: bytes.length,
  }
}

async function runWithConcurrency(items, limit, worker) {
  const results = []
  let nextIndex = 0

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1

      results[index] = await worker(items[index])
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker())
  await Promise.all(workers)

  return results
}

function summarize(results) {
  return results.reduce(
    (summary, result) => {
      summary[result.status] = (summary[result.status] ?? 0) + 1

      if (result.bytes) {
        summary.bytes += result.bytes
      }

      return summary
    },
    { bytes: 0 }
  )
}

async function main() {
  const connection = await mysql.createConnection({ uri: databaseUrl })

  let assets

  try {
    assets = await collectReferencedAssets(connection)
  } finally {
    await connection.end()
  }

  console.log(`Found ${assets.length} unique referenced Supabase Storage file(s).`)
  console.log(`Bucket: ${bucket}`)
  console.log(`Destination: ${outputRoot}`)

  const results = await runWithConcurrency(assets, concurrency, downloadAsset)
  const summary = summarize(results)
  const failures = results.filter((result) => result.status === 'failed')

  console.log(JSON.stringify(summary, null, 2))

  if (failures.length) {
    console.error(`Failed to download ${failures.length} file(s):`)

    for (const failure of failures.slice(0, 20)) {
      console.error(`- ${failure.path}: ${failure.error}`)
    }

    if (failures.length > 20) {
      console.error(`...and ${failures.length - 20} more.`)
    }

    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
