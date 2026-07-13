export enum UserRole {
  faculty = 'faculty',
  secondary_admin = 'secondary_admin',
  main_admin = 'main_admin',
}

export enum AccessStatus {
  active = 'active',
  inactive = 'inactive',
}

export enum EmploymentStatus {
  full_time = 'full_time',
  part_time = 'part_time',
  contract = 'contract',
  emeritus = 'emeritus',
}

export enum Department {
  SASTE = 'SASTE',
  SITE = 'SITE',
  SBHAM = 'SBHAM',
  SNAHS = 'SNAHS',
  SOM = 'SOM',
  BEU = 'BEU',
  CF = 'CF',
  KIRN = 'KIRN',
  GUIDANCE = 'GUIDANCE',
}

export enum PublicationStatus {
  published = 'published',
  accepted = 'accepted',
  submitted = 'submitted',
  in_press = 'in_press',
}

export enum PublicationType {
  journal = 'journal',
  conference = 'conference',
  book = 'book',
  chapter = 'chapter',
  patent = 'patent',
  other = 'other',
  journal_article = 'journal_article',
  conference_paper = 'conference_paper',
  book_chapter = 'book_chapter',
  review_article = 'review_article',
  creative_work = 'creative_work',
}

export enum EngagementType {
  consulting = 'consulting',
  training = 'training',
  community_service = 'community_service',
  industry_partnership = 'industry_partnership',
  policy_advisory = 'policy_advisory',
  other = 'other',
}

export enum EngagementStatus {
  planned = 'planned',
  ongoing = 'ongoing',
  completed = 'completed',
}

export enum ResearchTitleStatus {
  proposed = 'proposed',
  ongoing = 'ongoing',
  completed = 'completed',
  published = 'published',
}

export enum FacultyInviteStatus {
  pending = 'pending',
  linked = 'linked',
  cancelled = 'cancelled',
}

export enum NotificationAudience {
  faculty = 'faculty',
  admin = 'admin',
}

export enum NotificationKind {
  broadcast = 'broadcast',
  faculty_signed_in = 'faculty_signed_in',
  profile_completed = 'profile_completed',
  education_added = 'education_added',
  publication_added = 'publication_added',
  engagement_added = 'engagement_added',
  research_added = 'research_added',
}
