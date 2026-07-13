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
const pageSize = Number(process.env.SUPABASE_IMPORT_PAGE_SIZE ?? 500)
const replaceTarget = process.argv.includes('--replace')

const DEFAULT_TABLES = [
  'users',
  'accounts',
  'sessions',
  'user_role_assignments',
  'faculty_profiles',
  'education_entries',
  'publications',
  'publication_contributors',
  'engagements',
  'research_titles',
  'faculty_invites',
  'faculty_invite_roles',
  'user_preferences',
  'admin_settings',
  'push_subscriptions',
  'admin_broadcasts',
  'notifications',
  'user_notifications',
]

const tables = (process.env.SUPABASE_IMPORT_TABLES || '')
  .split(',')
  .map((table) => table.trim())
  .filter(Boolean)

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

function quoteIdentifier(identifier) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`)
  }

  return `\`${identifier}\``
}

function normalizeValue(value) {
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return JSON.stringify(value)
  }

  return value
}

function getRowColumns(rows, destinationColumns) {
  const sourceColumns = new Set(rows.flatMap((row) => Object.keys(row)))
  return [...sourceColumns].filter((column) => destinationColumns.has(column)).sort()
}

function getIgnoredColumns(rows, destinationColumns) {
  const sourceColumns = new Set(rows.flatMap((row) => Object.keys(row)))
  return [...sourceColumns].filter((column) => !destinationColumns.has(column)).sort()
}

function buildUpsertSql(table, columns, primaryColumns, rowCount) {
  const quotedTable = quoteIdentifier(table)
  const quotedColumns = columns.map(quoteIdentifier).join(', ')
  const rowPlaceholders = `(${columns.map(() => '?').join(', ')})`
  const allPlaceholders = Array.from({ length: rowCount }, () => rowPlaceholders).join(', ')
  const updateColumns = columns.filter((column) => !primaryColumns.has(column))
  const updates = (updateColumns.length ? updateColumns : columns.slice(0, 1))
    .map((column) => `${quoteIdentifier(column)} = VALUES(${quoteIdentifier(column)})`)
    .join(', ')

  return `
    INSERT INTO ${quotedTable} (${quotedColumns})
    VALUES ${allPlaceholders}
    ON DUPLICATE KEY UPDATE ${updates}
  `
}

async function getDestinationShape(connection, table) {
  const [rows] = await connection.execute(
    `
      SELECT COLUMN_NAME AS column_name
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `,
    [table]
  )
  const [primaryRows] = await connection.execute(
    `
      SELECT COLUMN_NAME AS column_name
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = 'PRIMARY'
      ORDER BY ORDINAL_POSITION
    `,
    [table]
  )

  return {
    columns: new Set(rows.map((row) => row.column_name)),
    primaryColumns: new Set(primaryRows.map((row) => row.column_name)),
  }
}

async function fetchSourceBatch(table, offset) {
  const url = new URL(`${sourceUrl}/rest/v1/${table}`)
  url.searchParams.set('select', '*')

  const response = await fetch(url, {
    headers: {
      apikey: sourceServiceRoleKey,
      authorization: `Bearer ${sourceServiceRoleKey}`,
      range: `${offset}-${offset + pageSize - 1}`,
      'range-unit': 'items',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    const missingTable =
      response.status === 404 ||
      (response.status === 400 && /could not find|does not exist|schema cache/i.test(body))

    if (missingTable) {
      return null
    }

    throw new Error(`Failed to fetch ${table}: ${response.status} ${body}`)
  }

  return response.json()
}

async function importBatch(connection, table, destinationColumns, primaryColumns, rows) {
  if (!rows.length) {
    return 0
  }

  const columns = getRowColumns(rows, destinationColumns)

  if (!columns.length) {
    console.warn(`Skipped ${table} batch: no matching destination columns.`)
    return 0
  }

  const params = rows.flatMap((row) => columns.map((column) => normalizeValue(row[column] ?? null)))
  await connection.execute(buildUpsertSql(table, columns, primaryColumns, rows.length), params)

  return rows.length
}

async function importTable(connection, table) {
  const { columns: destinationColumns, primaryColumns } = await getDestinationShape(connection, table)

  if (!destinationColumns.size) {
    console.warn(`Skipped ${table}: destination table does not exist.`)
    return { table, status: 'missing_destination', rows: 0 }
  }

  let offset = 0
  let importedRows = 0
  let ignoredColumnsLogged = false

  await connection.beginTransaction()

  try {
    while (true) {
      const rows = await fetchSourceBatch(table, offset)

      if (rows === null) {
        await connection.rollback()
        console.warn(`Skipped ${table}: source table does not exist.`)
        return { table, status: 'missing_source', rows: 0 }
      }

      if (!Array.isArray(rows) || !rows.length) {
        await connection.commit()
        console.log(`Imported ${importedRows} ${table} rows`)
        return { table, status: 'imported', rows: importedRows }
      }

      if (!ignoredColumnsLogged) {
        const ignoredColumns = getIgnoredColumns(rows, destinationColumns)

        if (ignoredColumns.length) {
          console.warn(`Ignoring ${table} source columns not in MySQL: ${ignoredColumns.join(', ')}`)
          ignoredColumnsLogged = true
        }
      }

      importedRows += await importBatch(connection, table, destinationColumns, primaryColumns, rows)

      if (rows.length < pageSize) {
        await connection.commit()
        console.log(`Imported ${importedRows} ${table} rows`)
        return { table, status: 'imported', rows: importedRows }
      }

      offset += pageSize
    }
  } catch (error) {
    await connection.rollback().catch(() => {})
    throw error
  }
}

async function clearTargetTables(connection, importTables) {
  console.warn('Replace mode enabled: clearing local MySQL data before Supabase import.')
  await connection.query('SET FOREIGN_KEY_CHECKS = 0')

  try {
    for (const table of [...importTables].reverse()) {
      const { columns } = await getDestinationShape(connection, table)

      if (!columns.size) {
        continue
      }

      await connection.query(`DELETE FROM ${quoteIdentifier(table)}`)
      console.log(`Cleared ${table}`)
    }
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1')
  }
}

function explainImportFailure(error) {
  if (error?.code === 'ER_ROW_IS_REFERENCED_2' || error?.code === 'ER_NO_REFERENCED_ROW_2') {
    return new Error(
      [
        error.message,
        '',
        'The local MySQL database already has related rows that conflict with Supabase IDs.',
        'For a full source-of-truth import, rerun:',
        'npm run import:supabase:replace',
      ].join('\n')
    )
  }

  return error
}

async function main() {
  if (!/^mysql2?:\/\//i.test(databaseUrl)) {
    throw new Error('DATABASE_URL must be a mysql:// or mysql2:// connection string.')
  }

  const connection = await mysql.createConnection(databaseUrl)
  const results = []
  const importTables = tables.length ? tables : DEFAULT_TABLES

  try {
    if (replaceTarget) {
      await clearTargetTables(connection, importTables)
    }

    for (const table of importTables) {
      console.log(`Importing ${table}`)
      results.push(await importTable(connection, table))
    }
  } finally {
    await connection.end()
  }

  const importedTotal = results.reduce((sum, result) => sum + result.rows, 0)
  console.log(`Supabase import complete. Imported ${importedTotal} rows total.`)
}

main().catch((error) => {
  console.error(explainImportFailure(error))
  process.exitCode = 1
})
