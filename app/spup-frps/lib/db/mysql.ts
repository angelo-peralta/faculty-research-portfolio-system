import 'server-only'

import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from 'mysql2/promise'

type QueryExecutor = Pick<Pool | PoolConnection, 'execute' | 'query'>

const globalForMysql = globalThis as typeof globalThis & {
  frpMysqlPool?: Pool
}

function getConnectionLimit() {
  const rawLimit = Number(process.env.MYSQL_CONNECTION_LIMIT ?? 10)
  return Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim()

  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL. Expected a MySQL URL such as mysql://USER:PASSWORD@HOST:3306/DATABASE.')
  }

  if (!databaseUrl.startsWith('mysql://') && !databaseUrl.startsWith('mysql2://')) {
    throw new Error('DATABASE_URL must point to MySQL.')
  }

  return databaseUrl
}

export function getMysqlPool() {
  if (!globalForMysql.frpMysqlPool) {
    globalForMysql.frpMysqlPool = mysql.createPool({
      uri: getDatabaseUrl(),
      connectionLimit: getConnectionLimit(),
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      multipleStatements: false,
      timezone: 'Z',
    })
  }

  return globalForMysql.frpMysqlPool
}

export async function queryRows<T extends RowDataPacket = RowDataPacket>(
  sql: string,
  params: readonly unknown[] = [],
  executor: QueryExecutor = getMysqlPool()
) {
  const [rows] = await executor.query<T[]>(sql, [...params])
  return rows
}

export async function queryOne<T extends RowDataPacket = RowDataPacket>(
  sql: string,
  params: readonly unknown[] = [],
  executor: QueryExecutor = getMysqlPool()
) {
  const rows = await queryRows<T>(sql, params, executor)
  return rows[0] ?? null
}

export async function execute(
  sql: string,
  params: readonly unknown[] = [],
  executor: QueryExecutor = getMysqlPool()
) {
  const [result] = await executor.execute<ResultSetHeader>(sql, [...params])
  return result
}

export async function transaction<T>(handler: (connection: PoolConnection) => Promise<T>) {
  const connection = await getMysqlPool().getConnection()

  try {
    await connection.beginTransaction()
    const result = await handler(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export function jsonParam(value: unknown) {
  return JSON.stringify(value ?? null)
}

export function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }

  if (typeof value !== 'string' || !value.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

export function parseJsonObject<T>(value: unknown, fallback: T): T {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as T
  }

  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }

  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as T)
      : fallback
  } catch {
    return fallback
  }
}

export function toDate(value: Date | string | null | undefined) {
  if (!value) {
    return null
  }

  return value instanceof Date ? value : new Date(value)
}

export function toIsoString(value: Date | string | null | undefined) {
  return toDate(value)?.toISOString() ?? null
}

export type { PoolConnection, RowDataPacket }
