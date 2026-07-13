import JSZip from 'jszip'
import { execute, queryOne, type RowDataPacket } from '@/lib/db/mysql'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { toCsv } from '@/lib/server/csv'
import type {
  PushSubscriptionPayload,
  User,
  UserPreferences,
  UserPreferencesPayload,
} from '@/lib/types'

const DEFAULT_PREFERENCES = {
  emailNotifications: true,
  pushNotifications: true,
  deadlineReminders: true,
  systemUpdates: false,
} as const

interface PreferenceRow extends RowDataPacket {
  emailNotifications: number | boolean
  pushNotifications: number | boolean
  deadlineReminders: number | boolean
  systemUpdates: number | boolean
  initialPromptSeenAt: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

function mapPreferences(row: PreferenceRow): UserPreferences {
  return {
    emailNotifications: Boolean(row.emailNotifications),
    pushNotifications: Boolean(row.pushNotifications),
    deadlineReminders: Boolean(row.deadlineReminders),
    systemUpdates: Boolean(row.systemUpdates),
    initial_prompt_seen_at: row.initialPromptSeenAt
      ? new Date(row.initialPromptSeenAt).toISOString()
      : null,
    created_at: new Date(row.createdAt).toISOString(),
    updated_at: new Date(row.updatedAt).toISOString(),
  }
}

function getExportFileStamp() {
  return new Date().toISOString().slice(0, 10)
}

function joinList(values: string[] | undefined) {
  return (values ?? []).join('; ')
}

async function readPreferences(userId: string) {
  return queryOne<PreferenceRow>(
    `
      SELECT
        email_notifications AS emailNotifications,
        push_notifications AS pushNotifications,
        deadline_reminders AS deadlineReminders,
        system_updates AS systemUpdates,
        initial_prompt_seen_at AS initialPromptSeenAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM user_preferences
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  )
}

export const FacultySettingsService = {
  async ensureUserPreferences(userId: string) {
    await execute(
      `
        INSERT IGNORE INTO user_preferences (
          user_id,
          email_notifications,
          push_notifications,
          deadline_reminders,
          system_updates,
          initial_prompt_seen_at
        )
        VALUES (?, ?, ?, ?, ?, NULL)
      `,
      [
        userId,
        DEFAULT_PREFERENCES.emailNotifications,
        DEFAULT_PREFERENCES.pushNotifications,
        DEFAULT_PREFERENCES.deadlineReminders,
        DEFAULT_PREFERENCES.systemUpdates,
      ]
    )

    const preferences = await readPreferences(userId)

    if (!preferences) {
      throw new Error('Unable to create user preferences.')
    }

    return preferences
  },

  async getMyPreferences(userId: string): Promise<UserPreferences> {
    const preferences = await this.ensureUserPreferences(userId)
    return mapPreferences(preferences)
  },

  async updateMyPreferences(userId: string, payload: UserPreferencesPayload): Promise<UserPreferences> {
    await this.ensureUserPreferences(userId)
    await execute(
      `
        UPDATE user_preferences
        SET
          email_notifications = COALESCE(?, email_notifications),
          push_notifications = COALESCE(?, push_notifications),
          deadline_reminders = COALESCE(?, deadline_reminders),
          system_updates = COALESCE(?, system_updates),
          initial_prompt_seen_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP(3) ELSE initial_prompt_seen_at END
        WHERE user_id = ?
      `,
      [
        payload.emailNotifications ?? null,
        payload.pushNotifications ?? null,
        payload.deadlineReminders ?? null,
        payload.systemUpdates ?? null,
        payload.markInitialPromptSeen ? 1 : 0,
        userId,
      ]
    )

    const preferences = await readPreferences(userId)

    if (!preferences) {
      throw new Error('Unable to load updated user preferences.')
    }

    return mapPreferences(preferences)
  },

  async upsertPushSubscription(userId: string, payload: PushSubscriptionPayload) {
    await execute(
      `
        INSERT INTO push_subscriptions (
          user_id,
          endpoint,
          p256dh,
          auth,
          user_agent,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          user_id = VALUES(user_id),
          p256dh = VALUES(p256dh),
          auth = VALUES(auth),
          user_agent = VALUES(user_agent),
          is_active = 1
      `,
      [
        userId,
        payload.endpoint,
        payload.keys.p256dh,
        payload.keys.auth,
        payload.userAgent ?? null,
      ]
    )
  },

  async deactivatePushSubscription(userId: string, endpoint: string) {
    const result = await execute(
      `
        UPDATE push_subscriptions
        SET is_active = 0
        WHERE user_id = ?
          AND endpoint = ?
          AND is_active = 1
      `,
      [userId, endpoint]
    )

    return result.affectedRows > 0
  },

  async buildMyExportData(user: User) {
    const [profile, completion, preferences, education, publications, engagements, researchTitles] =
      await Promise.all([
        FacultyDataService.getMyProfile(user),
        FacultyDataService.getProfileCompletion(user.id),
        this.getMyPreferences(user.id),
        FacultyDataService.listMyEducation(user.id),
        FacultyDataService.listMyPublications(user.id),
        FacultyDataService.listMyEngagements(user.id),
        FacultyDataService.listMyResearchTitles(user.id),
      ])

    return {
      generatedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
      },
      profile,
      completion,
      preferences,
      education,
      publications,
      engagements,
      researchTitles,
    }
  },

  async buildMyJsonExport(user: User) {
    const data = await this.buildMyExportData(user)

    return {
      filename: `faculty-portfolio-${getExportFileStamp()}.json`,
      content: JSON.stringify(data, null, 2),
    }
  },

  async buildMyCsvZip(user: User) {
    const data = await this.buildMyExportData(user)
    const zip = new JSZip()

    zip.file(
      'profile.csv',
      toCsv([
        {
          id: data.profile.id,
          email: data.profile.email,
          name: data.profile.name,
          department: data.profile.department ?? '',
          specialization: data.profile.specialization ?? '',
          employment_status: data.profile.employment_status ?? '',
          photo_path: data.profile.photo_path ?? '',
          banner_path: data.profile.banner_path ?? '',
          created_at: data.profile.created_at,
          updated_at: data.profile.updated_at,
          last_login_at: data.profile.last_login_at ?? '',
        },
      ])
    )

    zip.file(
      'completion.csv',
      toCsv([
        {
          score: data.completion.score,
          has_profile: data.completion.hasProfile,
          has_education: data.completion.hasEducation,
          has_publications: data.completion.hasPublications,
          has_engagements: data.completion.hasEngagements,
          has_research_titles: data.completion.hasResearchTitles,
          education_count: data.completion.educationCount,
          publications_count: data.completion.publicationsCount,
          engagements_count: data.completion.engagementsCount,
          research_titles_count: data.completion.researchTitlesCount,
        },
      ])
    )

    zip.file(
      'preferences.csv',
      toCsv([
        {
          email_notifications: data.preferences.emailNotifications,
          push_notifications: data.preferences.pushNotifications,
          deadline_reminders: data.preferences.deadlineReminders,
          system_updates: data.preferences.systemUpdates,
          created_at: data.preferences.created_at,
          updated_at: data.preferences.updated_at,
        },
      ])
    )

    zip.file(
      'education.csv',
      toCsv(
        data.education.map((entry) => ({
          id: entry.id,
          degree: entry.degree,
          field: entry.field,
          institution: entry.institution,
          year: entry.year,
          display_order: entry.display_order,
        }))
      )
    )

    zip.file(
      'publications.csv',
      toCsv(
        data.publications.map((publication) => ({
          id: publication.id,
          title: publication.title,
          type: publication.type,
          authors: joinList(publication.authors),
          year: publication.year,
          venue: publication.venue,
          doi: publication.doi,
          status: publication.status ?? '',
          indexing: joinList(publication.indexing),
          sdg_goals: joinList(publication.sdgGoals),
          citations: publication.citations,
          external_url: publication.external_url ?? '',
          display_order: publication.display_order,
        }))
      )
    )

    zip.file(
      'engagements.csv',
      toCsv(
        data.engagements.map((engagement) => ({
          id: engagement.id,
          title: engagement.title,
          type: engagement.type,
          organization: engagement.organization,
          status: engagement.status,
          start_date: engagement.startDate,
          end_date: engagement.endDate,
          beneficiaries: engagement.beneficiaries,
          certificate_path: engagement.certificate_path ?? '',
          display_order: engagement.display_order,
        }))
      )
    )

    zip.file(
      'research.csv',
      toCsv(
        data.researchTitles.map((researchTitle) => ({
          id: researchTitle.id,
          title: researchTitle.title,
          status: researchTitle.status,
          researchers: joinList(researchTitle.researchers),
          start_date: researchTitle.startDate ?? '',
          end_date: researchTitle.endDate ?? '',
          funding_source: researchTitle.fundingSource ?? '',
          funding_amount: researchTitle.fundingAmount ?? 0,
          progress: researchTitle.progress ?? 0,
          sdg_goals: joinList(researchTitle.sdgGoals),
          paper_path: researchTitle.paper_path ?? '',
          display_order: researchTitle.display_order,
        }))
      )
    )

    return {
      filename: `faculty-portfolio-${getExportFileStamp()}.zip`,
      content: await zip.generateAsync({ type: 'uint8array' }),
    }
  },
}
