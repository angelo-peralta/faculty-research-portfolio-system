import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import mysql from 'mysql2/promise'
import { loadProjectEnv, requireEnv } from './lib/env.mjs'

loadProjectEnv()

const databaseUrl = requireEnv('DATABASE_URL')
const migrationsDir = join(process.cwd(), 'migrations')

function checksum(contents) {
  return createHash('sha256').update(contents).digest('hex')
}

function assertMysqlUrl(url) {
  if (!/^mysql2?:\/\//i.test(url)) {
    throw new Error('DATABASE_URL must be a mysql:// or mysql2:// connection string.')
  }
}

async function main() {
  assertMysqlUrl(databaseUrl)

  let connection

  try {
    connection = await mysql.createConnection({
      uri: databaseUrl,
      multipleStatements: true,
    })
  } catch (error) {
    if (error?.code === 'ECONNREFUSED') {
      const url = new URL(databaseUrl)
      const host = url.hostname || '127.0.0.1'
      const port = url.port || '3306'

      throw new Error(
        [
          `Could not connect to MySQL at ${host}:${port}.`,
          'Start your MySQL 8 server, or update DATABASE_URL to point at the running MySQL host.',
          'After MySQL is running, create the database/user from MIGRATION.md and run npm run migrate again.',
        ].join('\n')
      )
    }

    throw error
  }

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    const [appliedRows] = await connection.query('SELECT id, checksum FROM schema_migrations')
    const applied = new Map(appliedRows.map((row) => [row.id, row.checksum]))

    const files = readdirSync(migrationsDir)
      .filter((file) => extname(file) === '.sql')
      .sort((left, right) => left.localeCompare(right))

    for (const file of files) {
      const migrationId = file.replace(/\.sql$/, '')
      const contents = readFileSync(join(migrationsDir, file), 'utf8')
      const nextChecksum = checksum(contents)
      const previousChecksum = applied.get(migrationId)

      if (previousChecksum) {
        if (previousChecksum !== nextChecksum) {
          throw new Error(`Migration ${migrationId} was modified after it was applied.`)
        }

        console.log(`Skipped ${migrationId}`)
        continue
      }

      console.log(`Applying ${migrationId}`)
      await connection.query(contents)
      await connection.query(
        'INSERT INTO schema_migrations (id, checksum) VALUES (?, ?)',
        [migrationId, nextChecksum]
      )
      console.log(`Applied ${migrationId}`)
    }
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
