import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function stripQuotes(value) {
  const trimmed = value.trim()

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function parseEnvLine(line) {
  const trimmed = line.trim()

  if (!trimmed || trimmed.startsWith('#')) {
    return null
  }

  const equalsIndex = trimmed.indexOf('=')

  if (equalsIndex === -1) {
    return null
  }

  const key = trimmed.slice(0, equalsIndex).trim()
  const value = stripQuotes(trimmed.slice(equalsIndex + 1))

  return key ? [key, value] : null
}

export function loadProjectEnv(root = process.cwd(), filenames = ['.env', '.env.local']) {
  const inheritedKeys = new Set(Object.keys(process.env))

  for (const filename of filenames) {
    const filePath = resolve(root, filename)

    if (!existsSync(filePath)) {
      continue
    }

    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const parsed = parseEnvLine(line)

      if (!parsed) {
        continue
      }

      const [key, value] = parsed

      if (!inheritedKeys.has(key)) {
        process.env[key] = value
      }
    }
  }
}

export function requireEnv(name) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}
