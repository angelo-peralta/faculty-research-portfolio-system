CREATE TABLE IF NOT EXISTS schema_migrations (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  azure_object_id VARCHAR(191) NULL UNIQUE,
  email VARCHAR(320) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  avatar_url LONGTEXT NULL,
  access_status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NULL,
  INDEX users_access_status_idx (access_status),
  INDEX users_created_at_idx (created_at),
  INDEX users_last_login_at_idx (last_login_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accounts (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  provider VARCHAR(64) NOT NULL,
  provider_account_id VARCHAR(191) NOT NULL,
  account_type VARCHAR(64) NOT NULL DEFAULT 'oauth',
  scope TEXT NULL,
  token_type VARCHAR(64) NULL,
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY accounts_provider_account_unique (provider, provider_account_id),
  INDEX accounts_user_id_idx (user_id),
  CONSTRAINT accounts_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  session_token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX sessions_user_id_idx (user_id),
  INDEX sessions_expires_at_idx (expires_at),
  CONSTRAINT sessions_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_role_assignments (
  user_id CHAR(36) NOT NULL,
  role ENUM('faculty', 'secondary_admin', 'main_admin') NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, role),
  INDEX user_role_assignments_role_idx (role),
  CONSTRAINT user_role_assignments_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faculty_profiles (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  department ENUM('SASTE', 'SITE', 'SBHAM', 'SNAHS', 'SOM', 'BEU', 'CF', 'KIRN', 'GUIDANCE') NULL,
  specialization VARCHAR(255) NULL,
  employment_status ENUM('full_time', 'part_time', 'contract', 'emeritus') NULL,
  photo_path VARCHAR(1024) NULL,
  banner_path VARCHAR(1024) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX faculty_profiles_department_idx (department),
  CONSTRAINT faculty_profiles_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS education_entries (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  degree VARCHAR(255) NOT NULL,
  field VARCHAR(255) NOT NULL,
  institution VARCHAR(255) NOT NULL,
  year INT NOT NULL,
  display_order INT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX education_entries_user_display_idx (user_id, display_order),
  CONSTRAINT education_entries_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publications (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  title TEXT NOT NULL,
  type ENUM('journal', 'conference', 'book', 'chapter', 'patent', 'other', 'journal_article', 'conference_paper', 'book_chapter', 'review_article', 'creative_work') NOT NULL,
  authors JSON NOT NULL,
  author_count INT NOT NULL DEFAULT 1,
  year INT NOT NULL,
  venue TEXT NOT NULL,
  volume VARCHAR(64) NULL,
  issue VARCHAR(64) NULL,
  page_numbers VARCHAR(128) NULL,
  doi VARCHAR(255) NULL,
  abstract TEXT NULL,
  status ENUM('published', 'accepted', 'submitted', 'in_press') NOT NULL DEFAULT 'submitted',
  external_url TEXT NULL,
  indexing JSON NOT NULL,
  quartile_ranking VARCHAR(16) NULL,
  open_access TINYINT(1) NULL,
  faculty_role VARCHAR(64) NULL,
  is_lead_corresponding TINYINT(1) NULL,
  institution_affiliated TINYINT(1) NOT NULL DEFAULT 1,
  sdg_goals JSON NOT NULL,
  citations INT NOT NULL DEFAULT 0,
  proof_path VARCHAR(1024) NULL,
  display_order INT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX publications_user_display_idx (user_id, display_order),
  INDEX publications_user_year_idx (user_id, year),
  INDEX publications_created_at_idx (created_at),
  INDEX publications_status_created_at_idx (status, created_at),
  INDEX publications_type_year_idx (type, year),
  FULLTEXT INDEX publications_text_idx (title, venue),
  CONSTRAINT publications_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publication_contributors (
  publication_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  faculty_role VARCHAR(64) NOT NULL DEFAULT 'co_author',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (publication_id, user_id),
  INDEX publication_contributors_user_id_idx (user_id),
  CONSTRAINT publication_contributors_publication_id_fk FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  CONSTRAINT publication_contributors_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS engagements (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  title TEXT NOT NULL,
  type ENUM('consulting', 'training', 'community_service', 'industry_partnership', 'policy_advisory', 'other') NOT NULL,
  organization TEXT NOT NULL,
  status ENUM('planned', 'ongoing', 'completed') NOT NULL DEFAULT 'ongoing',
  start_date DATETIME(3) NOT NULL,
  end_date DATETIME(3) NULL,
  description TEXT NULL,
  beneficiaries INT NOT NULL DEFAULT 0,
  sdg_goals JSON NOT NULL,
  certificate_path VARCHAR(1024) NULL,
  display_order INT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX engagements_user_display_idx (user_id, display_order),
  INDEX engagements_user_start_idx (user_id, start_date),
  INDEX engagements_created_at_idx (created_at),
  INDEX engagements_status_created_at_idx (status, created_at),
  CONSTRAINT engagements_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS research_titles (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  title TEXT NOT NULL,
  status ENUM('proposed', 'ongoing', 'completed', 'published') NOT NULL DEFAULT 'proposed',
  researchers JSON NOT NULL,
  start_date DATETIME(3) NOT NULL,
  end_date DATETIME(3) NULL,
  funding_source TEXT NULL,
  funding_amount INT NULL,
  description TEXT NULL,
  progress INT NULL,
  sdg_goals JSON NOT NULL,
  paper_path VARCHAR(1024) NULL,
  display_order INT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX research_titles_user_display_idx (user_id, display_order),
  INDEX research_titles_user_start_idx (user_id, start_date),
  INDEX research_titles_created_at_idx (created_at),
  INDEX research_titles_status_created_at_idx (status, created_at),
  FULLTEXT INDEX research_titles_text_idx (title),
  CONSTRAINT research_titles_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faculty_invites (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(320) NOT NULL UNIQUE,
  name VARCHAR(255) NULL,
  department ENUM('SASTE', 'SITE', 'SBHAM', 'SNAHS', 'SOM', 'BEU', 'CF', 'KIRN', 'GUIDANCE') NULL,
  employment_status ENUM('full_time', 'part_time', 'contract', 'emeritus') NULL,
  invite_status ENUM('pending', 'linked', 'cancelled') NOT NULL DEFAULT 'pending',
  linked_user_id CHAR(36) NULL UNIQUE,
  created_by_user_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX faculty_invites_status_idx (invite_status),
  INDEX faculty_invites_status_department_idx (invite_status, department),
  CONSTRAINT faculty_invites_linked_user_fk FOREIGN KEY (linked_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT faculty_invites_created_by_fk FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faculty_invite_roles (
  invite_id CHAR(36) NOT NULL,
  role ENUM('faculty', 'secondary_admin', 'main_admin') NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (invite_id, role),
  CONSTRAINT faculty_invite_roles_invite_id_fk FOREIGN KEY (invite_id) REFERENCES faculty_invites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  email_notifications TINYINT(1) NOT NULL DEFAULT 1,
  push_notifications TINYINT(1) NOT NULL DEFAULT 1,
  deadline_reminders TINYINT(1) NOT NULL DEFAULT 1,
  system_updates TINYINT(1) NOT NULL DEFAULT 0,
  initial_prompt_seen_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT user_preferences_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_settings (
  `key` VARCHAR(191) NOT NULL PRIMARY KEY,
  value JSON NOT NULL,
  updated_by_user_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT admin_settings_updated_by_fk FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  endpoint VARCHAR(768) NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX push_subscriptions_user_active_idx (user_id, is_active),
  CONSTRAINT push_subscriptions_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_by_user_id CHAR(36) NOT NULL,
  target_count INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  failure_count INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX admin_broadcasts_created_at_idx (created_at),
  CONSTRAINT admin_broadcasts_created_by_fk FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  audience ENUM('faculty', 'admin') NOT NULL,
  kind ENUM('broadcast', 'faculty_signed_in', 'profile_completed', 'education_added', 'publication_added', 'engagement_added', 'research_added') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  href TEXT NULL,
  actor_user_id CHAR(36) NULL,
  related_user_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX notifications_audience_created_idx (audience, created_at),
  INDEX notifications_kind_created_idx (kind, created_at),
  CONSTRAINT notifications_actor_user_fk FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT notifications_related_user_fk FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_notifications (
  user_id CHAR(36) NOT NULL,
  notification_id CHAR(36) NOT NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, notification_id),
  INDEX user_notifications_user_read_created_idx (user_id, read_at, created_at),
  INDEX user_notifications_notification_id_idx (notification_id),
  CONSTRAINT user_notifications_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT user_notifications_notification_id_fk FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS legacy_import_batches (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  source_filename VARCHAR(1024) NOT NULL,
  checksum VARCHAR(128) NOT NULL UNIQUE,
  batch_status ENUM('active', 'superseded', 'purged') NOT NULL DEFAULT 'active',
  total_rows INT NOT NULL DEFAULT 0,
  staged_faculty_count INT NOT NULL DEFAULT 0,
  issue_count INT NOT NULL DEFAULT 0,
  imported_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX legacy_import_batches_status_imported_idx (batch_status, imported_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS legacy_faculty_stage (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  batch_id CHAR(36) NOT NULL,
  email VARCHAR(320) NOT NULL,
  name VARCHAR(255) NULL,
  department ENUM('SASTE', 'SITE', 'SBHAM', 'SNAHS', 'SOM', 'BEU', 'CF', 'KIRN', 'GUIDANCE') NULL,
  specialization VARCHAR(255) NULL,
  employment_status ENUM('full_time', 'part_time', 'contract', 'emeritus') NULL,
  linked_user_id CHAR(36) NULL,
  review_status ENUM('pending', 'skipped', 'partial', 'imported', 'discarded') NOT NULL DEFAULT 'pending',
  profile_row_status ENUM('pending', 'imported', 'skipped', 'review_required', 'discarded') NOT NULL DEFAULT 'pending',
  last_skipped_at DATETIME(3) NULL,
  processed_at DATETIME(3) NULL,
  raw_source_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY legacy_faculty_stage_batch_email_unique (batch_id, email),
  INDEX legacy_faculty_stage_email_review_idx (email, review_status),
  INDEX legacy_faculty_stage_linked_user_idx (linked_user_id),
  CONSTRAINT legacy_faculty_stage_batch_id_fk FOREIGN KEY (batch_id) REFERENCES legacy_import_batches(id) ON DELETE CASCADE,
  CONSTRAINT legacy_faculty_stage_linked_user_fk FOREIGN KEY (linked_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS legacy_education_stage (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  faculty_stage_id CHAR(36) NOT NULL,
  source_row_index INT NOT NULL,
  degree VARCHAR(255) NULL,
  field VARCHAR(255) NULL,
  institution VARCHAR(255) NULL,
  year INT NULL,
  source_year VARCHAR(64) NULL,
  row_status ENUM('pending', 'imported', 'skipped', 'review_required', 'discarded') NOT NULL DEFAULT 'pending',
  processed_at DATETIME(3) NULL,
  raw_source_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX legacy_education_stage_faculty_status_idx (faculty_stage_id, row_status),
  INDEX legacy_education_stage_source_idx (source_row_index),
  CONSTRAINT legacy_education_stage_faculty_stage_fk FOREIGN KEY (faculty_stage_id) REFERENCES legacy_faculty_stage(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS legacy_publication_stage (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  faculty_stage_id CHAR(36) NOT NULL,
  source_row_index INT NOT NULL,
  title TEXT NULL,
  type ENUM('journal', 'conference', 'book', 'chapter', 'patent', 'other', 'journal_article', 'conference_paper', 'book_chapter', 'review_article', 'creative_work') NOT NULL DEFAULT 'journal',
  venue TEXT NULL,
  year INT NULL,
  source_year VARCHAR(64) NULL,
  external_url TEXT NULL,
  status ENUM('published', 'accepted', 'submitted', 'in_press') NULL,
  source_status VARCHAR(128) NULL,
  authors JSON NOT NULL,
  indexing JSON NOT NULL,
  source_indexing TEXT NULL,
  sdg_goals JSON NOT NULL,
  source_sdg_goals TEXT NULL,
  row_status ENUM('pending', 'imported', 'skipped', 'review_required', 'discarded') NOT NULL DEFAULT 'pending',
  processed_at DATETIME(3) NULL,
  raw_source_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX legacy_publication_stage_faculty_status_idx (faculty_stage_id, row_status),
  INDEX legacy_publication_stage_source_idx (source_row_index),
  CONSTRAINT legacy_publication_stage_faculty_stage_fk FOREIGN KEY (faculty_stage_id) REFERENCES legacy_faculty_stage(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS legacy_engagement_stage (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  faculty_stage_id CHAR(36) NOT NULL,
  source_row_index INT NOT NULL,
  title TEXT NULL,
  organization TEXT NULL,
  type ENUM('consulting', 'training', 'community_service', 'industry_partnership', 'policy_advisory', 'other') NULL,
  source_type VARCHAR(128) NULL,
  status ENUM('planned', 'ongoing', 'completed') NULL,
  start_date DATETIME(3) NULL,
  end_date DATETIME(3) NULL,
  source_year VARCHAR(64) NULL,
  raw_certificate TEXT NULL,
  raw_location TEXT NULL,
  raw_role TEXT NULL,
  row_status ENUM('pending', 'imported', 'skipped', 'review_required', 'discarded') NOT NULL DEFAULT 'pending',
  processed_at DATETIME(3) NULL,
  raw_source_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX legacy_engagement_stage_faculty_status_idx (faculty_stage_id, row_status),
  INDEX legacy_engagement_stage_source_idx (source_row_index),
  CONSTRAINT legacy_engagement_stage_faculty_stage_fk FOREIGN KEY (faculty_stage_id) REFERENCES legacy_faculty_stage(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS legacy_research_stage (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  faculty_stage_id CHAR(36) NOT NULL,
  source_row_index INT NOT NULL,
  title TEXT NULL,
  status ENUM('proposed', 'ongoing', 'completed', 'published') NULL,
  source_status VARCHAR(128) NULL,
  start_date DATETIME(3) NULL,
  end_date DATETIME(3) NULL,
  source_year VARCHAR(64) NULL,
  funding_source TEXT NULL,
  progress INT NULL,
  sdg_goals JSON NOT NULL,
  source_sdg_goals TEXT NULL,
  raw_paper TEXT NULL,
  raw_role TEXT NULL,
  row_status ENUM('pending', 'imported', 'skipped', 'review_required', 'discarded') NOT NULL DEFAULT 'pending',
  processed_at DATETIME(3) NULL,
  raw_source_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX legacy_research_stage_faculty_status_idx (faculty_stage_id, row_status),
  INDEX legacy_research_stage_source_idx (source_row_index),
  CONSTRAINT legacy_research_stage_faculty_stage_fk FOREIGN KEY (faculty_stage_id) REFERENCES legacy_faculty_stage(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS legacy_import_issues (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  batch_id CHAR(36) NOT NULL,
  faculty_stage_id CHAR(36) NULL,
  section ENUM('profile', 'education', 'publication', 'engagement', 'research') NOT NULL,
  source_row_index INT NULL,
  code VARCHAR(128) NOT NULL,
  message TEXT NOT NULL,
  raw_row_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX legacy_import_issues_batch_section_idx (batch_id, section),
  INDEX legacy_import_issues_faculty_stage_idx (faculty_stage_id),
  CONSTRAINT legacy_import_issues_batch_id_fk FOREIGN KEY (batch_id) REFERENCES legacy_import_batches(id) ON DELETE CASCADE,
  CONSTRAINT legacy_import_issues_faculty_stage_fk FOREIGN KEY (faculty_stage_id) REFERENCES legacy_faculty_stage(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
