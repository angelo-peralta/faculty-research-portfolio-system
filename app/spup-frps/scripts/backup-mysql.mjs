import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { loadProjectEnv, requireEnv } from './lib/env.mjs'

loadProjectEnv()

const databaseUrl = requireEnv('DATABASE_URL')
const dryRun = process.argv.includes('--dry-run')
const outputArg = process.argv.find((arg) => arg.startsWith('--output='))
const outputPath = resolve(
  outputArg?.slice('--output='.length) ||
    join('data', 'mysql-backups', `frp-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`)
)

function findOnPath(command) {
  const pathEntries = (process.env.PATH || '').split(process.platform === 'win32' ? ';' : ':')
  const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : ['']

  for (const entry of pathEntries) {
    for (const extension of extensions) {
      const candidate = join(entry, `${command}${extension}`)

      if (existsSync(candidate)) {
        return candidate
      }
    }
  }

  return null
}

function findDbnginMysqlDump() {
  const base = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, 'com.tinyapp.DBngin', 'Binaries', 'mysql')
    : null

  if (!base || !existsSync(base)) {
    return null
  }

  const stack = [base]

  while (stack.length) {
    const current = stack.pop()
    const entries = readdirSync(current, { withFileTypes: true })

    for (const entry of entries) {
      const entryPath = join(current, entry.name)

      if (entry.isFile() && entry.name.toLowerCase() === (process.platform === 'win32' ? 'mysqldump.exe' : 'mysqldump')) {
        return entryPath
      }

      if (entry.isDirectory()) {
        stack.push(entryPath)
      }
    }
  }

  return null
}

function getMysqlDumpPath() {
  return process.env.MYSQLDUMP_PATH?.trim() || findOnPath('mysqldump') || findDbnginMysqlDump()
}

function parseDatabaseUrl(url) {
  if (!/^mysql2?:\/\//i.test(url)) {
    throw new Error('DATABASE_URL must be a mysql:// or mysql2:// connection string.')
  }

  const parsed = new URL(url)
  const [rawUser = '', rawPassword = ''] = parsed.username || parsed.password
    ? [parsed.username, parsed.password]
    : parsed.href.match(/^mysql2?:\/\/([^@/]+)@/)?.[1]?.split(':') ?? []

  return {
    host: parsed.hostname || '127.0.0.1',
    port: parsed.port || '3306',
    user: decodeURIComponent(rawUser),
    password: decodeURIComponent(rawPassword),
    database: parsed.pathname.replace(/^\//, ''),
  }
}

const dumpPath = getMysqlDumpPath()

if (!dumpPath) {
  throw new Error('Could not find mysqldump. Install MySQL client tools or set MYSQLDUMP_PATH.')
}

const config = parseDatabaseUrl(databaseUrl)
const args = [
  '--single-transaction',
  '--routines',
  '--triggers',
  '--no-tablespaces',
  '--default-character-set=utf8mb4',
  '--protocol=TCP',
  `--host=${config.host}`,
  `--port=${config.port}`,
  `--user=${config.user}`,
  `--result-file=${outputPath}`,
  config.database,
]

if (dryRun) {
  console.log(`mysqldump: ${dumpPath}`)
  console.log(`output: ${outputPath}`)
  console.log(`database: ${config.database}`)
  process.exit(0)
}

mkdirSync(dirname(outputPath), { recursive: true })

const result = spawnSync(dumpPath, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    MYSQL_PWD: config.password,
  },
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

console.log(`MySQL backup written to ${outputPath}`)
