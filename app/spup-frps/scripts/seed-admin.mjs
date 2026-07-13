import { randomUUID } from 'node:crypto'
import mysql from 'mysql2/promise'
import { loadProjectEnv, requireEnv } from './lib/env.mjs'

loadProjectEnv()

const databaseUrl = requireEnv('DATABASE_URL')
const email = (process.argv[2] ?? process.env.INITIAL_ADMIN_EMAIL ?? '').trim().toLowerCase()
const name = (process.argv[3] ?? process.env.INITIAL_ADMIN_NAME ?? 'Main Administrator').trim()

if (!email) {
  console.error('Provide an admin email with INITIAL_ADMIN_EMAIL or as the first argument.')
  process.exit(1)
}

if (!/^mysql2?:\/\//i.test(databaseUrl)) {
  console.error('DATABASE_URL must be a mysql:// or mysql2:// connection string.')
  process.exit(1)
}

const connection = await mysql.createConnection(databaseUrl)

try {
  const [users] = await connection.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email])
  const user = users[0]

  if (user) {
    await connection.execute(
      'INSERT IGNORE INTO user_role_assignments (user_id, role) VALUES (?, ?)',
      [user.id, 'main_admin']
    )
    await connection.execute(
      'INSERT IGNORE INTO user_preferences (user_id) VALUES (?)',
      [user.id]
    )
    console.log(`Granted main_admin to existing user ${email}.`)
    process.exit(0)
  }

  const inviteId = randomUUID()

  await connection.beginTransaction()
  await connection.execute(
    `
      INSERT INTO faculty_invites (id, email, name, invite_status)
      VALUES (?, ?, ?, 'pending')
      ON DUPLICATE KEY UPDATE
        name = COALESCE(VALUES(name), name),
        invite_status = IF(invite_status = 'linked', invite_status, 'pending'),
        updated_at = CURRENT_TIMESTAMP(3)
    `,
    [inviteId, email, name || null]
  )

  const [invites] = await connection.execute(
    'SELECT id FROM faculty_invites WHERE email = ? LIMIT 1',
    [email]
  )
  const resolvedInviteId = invites[0]?.id ?? inviteId

  await connection.execute(
    'INSERT IGNORE INTO faculty_invite_roles (invite_id, role) VALUES (?, ?), (?, ?)',
    [resolvedInviteId, 'faculty', resolvedInviteId, 'main_admin']
  )
  await connection.commit()

  console.log(`Created or updated pending main_admin invite for ${email}.`)
  console.log('After this user signs in with Microsoft, the role will be linked automatically.')
} catch (error) {
  await connection.rollback().catch(() => {})
  throw error
} finally {
  await connection.end()
}
