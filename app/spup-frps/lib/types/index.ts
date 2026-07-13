export type UserRole = 'faculty' | 'secondary-admin' | 'main-admin'

export type AccessStatus = 'active' | 'inactive'

export type FacultyInviteStatus = 'pending' | 'linked' | 'cancelled'
export type NotificationKind =
  | 'broadcast'
  | 'faculty_signed_in'
  | 'profile_completed'
  | 'education_added'
  | 'publication_added'
  | 'engagement_added'
  | 'research_added'

export type EmploymentStatus = 'full-time' | 'part-time' | 'contract' | 'emeritus'

export type Department =
  | 'SASTE'
  | 'SITE'
  | 'SBHAM'
  | 'SNAHS'
  | 'SOM'
  | 'BEU'
  | 'CF'
  | 'KIRN'
  | 'GUIDANCE'

export type ResearchRole = 'lead-researcher' | 'co-researcher' | 'corresponding-author'

export type PublicationStatus = 'published' | 'accepted' | 'submitted' | 'in_press'

export type PublicationType =
  | 'journal'
  | 'conference'
  | 'book'
  | 'chapter'
  | 'patent'
  | 'other'
  | 'journal_article'
  | 'conference_paper'
  | 'book_chapter'
  | 'review_article'
  | 'creative_work'

export type PublicationQuartile = 'q1' | 'q2' | 'q3' | 'q4' | 'na'

export type PublicationFacultyRole =
  | 'first_author'
  | 'co_author'
  | 'corresponding_author'
  | 'sole_author'

export type EngagementType =
  | 'consulting'
  | 'training'
  | 'community_service'
  | 'industry_partnership'
  | 'policy_advisory'
  | 'other'
  | 'seminar'
  | 'paper-presentation'
  | 'conference'
  | 'workshop'
  | 'symposium'

export type EngagementStatus = 'ongoing' | 'completed' | 'planned'

export type FundingType = 'self-funded' | 'institutional' | 'external'

export type ResearchTitleStatus =
  | 'proposed'
  | 'ongoing'
  | 'completed'
  | 'published'
  | 'on-going'
  | 'proposal'

export type ResearchStatus = 'proposed' | 'ongoing' | 'completed' | 'published'

export interface Profile {
  id: string
  email: string
  name: string
  department: Department | null
  specialization: string | null
  employment_status: EmploymentStatus | null
  photo_path?: string | null
  banner_path?: string | null
  photo_url: string | null
  banner_url: string | null
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface AdminRole {
  user_id: string
  role: 'main-admin' | 'secondary-admin'
}

export interface EducationEntry {
  id: string
  profile_id: string
  degree: string
  field: string
  institution: string
  year: number
  display_order: number
}

export interface ResearchPublication {
  id: string
  profile_id: string
  title: string
  role?: ResearchRole | null
  journal?: string | null
  year: number
  link?: string | null
  status?: PublicationStatus
  indexed?: string | null
  sdgs?: string[]
  display_order: number
}

export interface Publication extends ResearchPublication {
  type: PublicationType
  authors: string[]
  author_count: number
  indexing: string[]
  sdgGoals: string[]
  venue: string
  volume?: string | null
  issue?: string | null
  page_numbers?: string | null
  doi: string
  abstract?: string
  external_url?: string | null
  quartile_ranking?: PublicationQuartile | null
  open_access?: boolean | null
  faculty_role?: PublicationFacultyRole | null
  is_lead_corresponding?: boolean | null
  institution_affiliated: boolean
  citations: number
  proof_path?: string | null
  proof_url: string | null
  owner_id?: string
  owner_name?: string
  owner_email?: string
  owner_avatar_url?: string | null
  co_author_user_ids?: string[]
  co_author_contributions?: PublicationCoAuthorContribution[]
  co_authors?: PublicationCoAuthor[]
  can_manage?: boolean
  is_shared?: boolean
}

export interface PublicationCoAuthorContribution {
  user_id: string
  faculty_role: PublicationFacultyRole
}

export interface PublicationCoAuthor {
  id: string
  name: string
  email: string
  department: Department | null
  avatar_url: string | null
  faculty_role?: PublicationFacultyRole | null
}

export type FacultySearchResult = PublicationCoAuthor

export interface ResearchEngagement {
  id: string
  profile_id: string
  title: string
  role?: string | null
  type: EngagementType
  host?: string | null
  location?: string | null
  year?: number | null
  certificate_path?: string | null
  certificate_url: string | null
  display_order: number
}

export interface Engagement extends ResearchEngagement {
  organization: string
  status: EngagementStatus
  description: string
  startDate: string
  endDate: string
  beneficiaries: number
}

export interface ResearchTitle {
  id: string
  profile_id: string
  title: string
  role?: ResearchRole | null
  year?: number | null
  funding_type?: FundingType | null
  funding_agency?: string | null
  status: ResearchTitleStatus
  sdgs?: string[]
  paper_path?: string | null
  paper_url: string | null
  display_order: number
  researchers?: string[]
  fundingSource?: string
  fundingAmount?: number
  description?: string
  progress?: number
  startDate?: string
  endDate?: string
  sdgGoals?: string[]
}

export interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
  roles: UserRole[]
}

export interface Session {
  user: User
  activeRole: UserRole
}

export interface UserPreferences {
  emailNotifications: boolean
  pushNotifications: boolean
  deadlineReminders: boolean
  systemUpdates: boolean
  initial_prompt_seen_at: string | null
  created_at: string
  updated_at: string
}

export interface UserPreferencesPayload {
  emailNotifications?: boolean
  pushNotifications?: boolean
  deadlineReminders?: boolean
  systemUpdates?: boolean
  markInitialPromptSeen?: boolean
}

export interface FacultyBootstrapData {
  profile: Profile
  education: EducationEntry[]
  publications: Publication[]
  engagements: Engagement[]
  researchTitles: ResearchTitle[]
}

export interface FacultyWorkspaceBootstrapData {
  preferences: UserPreferences
  notificationPreview: NotificationListResponse
  prompt_needed: boolean
}

export interface AdminWorkspaceBootstrapData {
  notificationPreview: NotificationListResponse
}

export interface PushSubscriptionPayload {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string | null
}

export interface AdminBroadcastPayload {
  title: string
  message: string
}

export interface AdminBroadcastRecord {
  id: string
  title: string
  message: string
  target_count: number
  success_count: number
  failure_count: number
  created_by_user_id: string
  created_by_name: string
  created_at: string
}

export interface NotificationItem {
  id: string
  kind: NotificationKind
  title: string
  message: string
  href: string | null
  created_at: string
  read_at: string | null
  actor_user_id: string | null
  actor_name: string | null
  related_user_id: string | null
  related_user_name: string | null
}

export interface NotificationListResponse {
  items: NotificationItem[]
  unread_count: number
}

export interface NotificationReadPayload {
  ids?: string[]
  markAll?: boolean
}

export interface NotificationReadResult {
  unread_count: number
}

export interface ActivityLog {
  id: string
  profile_id: string
  action: string
  details: string
  timestamp: string
}

export interface ProfileUpdatePayload {
  name?: string
  department?: Department | null
  specialization?: string | null
  employment_status?: EmploymentStatus | null
  photo_path?: string | null
  banner_path?: string | null
}

export interface EducationPayload {
  id?: string
  degree: string
  field: string
  institution: string
  year: number
  display_order?: number
}

export interface PublicationPayload {
  id?: string
  title: string
  type: PublicationType
  authors: string[]
  co_author_user_ids?: string[]
  co_author_contributions?: PublicationCoAuthorContribution[]
  author_count: number
  year: number
  venue: string
  volume?: string
  issue?: string
  page_numbers?: string
  doi?: string
  abstract?: string
  status?: PublicationStatus
  indexing?: string[]
  quartile_ranking?: PublicationQuartile | null
  open_access?: boolean | null
  faculty_role?: PublicationFacultyRole | null
  is_lead_corresponding?: boolean | null
  institution_affiliated: boolean
  sdgGoals?: string[]
  citations?: number
  external_url?: string | null
  proof_path?: string | null
  display_order?: number
}

export interface PublicationDoiLookupResult {
  source: 'openalex'
  openalex_id: string | null
  openalex_url: string | null
  matched_doi: string
  publication: PublicationPayload
}

export interface EngagementPayload {
  id?: string
  title: string
  type: Exclude<EngagementType, 'seminar' | 'paper-presentation' | 'conference' | 'workshop' | 'symposium'>
  organization: string
  status: EngagementStatus
  startDate: string
  endDate?: string
  description?: string
  beneficiaries?: number
  certificate_path?: string | null
  display_order?: number
}

export interface ResearchTitlePayload {
  id?: string
  title: string
  status: ResearchStatus
  researchers: string[]
  startDate: string
  endDate?: string
  fundingSource?: string
  fundingAmount?: number
  description?: string
  progress?: number
  sdgGoals?: string[]
  paper_path?: string | null
  display_order?: number
}

export interface DepartmentSummary {
  department: Department
  facultyCount: number
  publicationsCount: number
  engagementsCount: number
  researchTitlesCount: number
  avgCompletionScore: number
}

export interface TrendDataPoint {
  year: number
  publications: number
  engagements: number
  researchTitles: number
}

export interface SDGDistribution {
  sdg: string
  count: number
}

export interface FacultyListFilters {
  search?: string
  department?: Department | 'all'
  employment_status?: EmploymentStatus | 'all'
  completionLevel?: 'complete' | 'incomplete' | 'all'
}

export interface ProfileCompletionStatus {
  hasProfile: boolean
  hasEducation: boolean
  hasPublications: boolean
  hasEngagements: boolean
  hasResearchTitles: boolean
  score: number
  educationCount: number
  publicationsCount: number
  engagementsCount: number
  researchTitlesCount: number
}

export interface AdminRecentActivityItem {
  id: string
  type: 'publication' | 'engagement' | 'research'
  title: string
  user_id: string
  user_name: string
  user_avatar_url: string | null
  created_at: string
}

export interface AdminPendingActionItem {
  id: string
  recordType: 'user' | 'invite'
  title: string
  subtitle: string
  issue: string
  href: string | null
  created_at: string
}

export interface AdminDepartmentPerformanceItem {
  department: Department
  label: string
  facultyCount: number
  activeFacultyCount: number
  publicationsCount: number
  indexedPublicationsCount: number
  engagementsCount: number
  researchTitlesCount: number
  avgCompletionScore: number
}

export type DecisionSupportSeverity = 'low' | 'medium' | 'high'

export interface DecisionSupportConfig {
  readinessWeights: {
    activeAccount: number
    profileComplete: number
    educationComplete: number
    publicationTargetMet: number
    indexedPublicationTargetMet: number
    engagementTargetMet: number
    researchTargetMet: number
  }
  riskWeights: {
    inactiveAccount: number
    incompleteProfile: number
    noPublications: number
    noIndexedPublications: number
    noEngagements: number
    noResearch: number
    staleLogin: number
  }
  thresholds: {
    publicationTarget: number
    indexedPublicationTarget: number
    engagementTarget: number
    researchTarget: number
    staleLoginDays: number
  }
  bands: {
    readiness: {
      medium: number
      high: number
    }
    risk: {
      medium: number
      high: number
    }
  }
  dashboard: {
    facultyLimit: number
    departmentLimit: number
  }
}

export interface AdminDecisionSupportFacultyItem {
  id: string
  name: string
  email: string
  department: Department | null
  avatarUrl: string | null
  accessStatus: AccessStatus
  lastLoginAt: string | null
  readinessScore: number
  riskScore: number
  severity: DecisionSupportSeverity
  reasons: string[]
  nextActionLabel: string
  href: string
}

export interface AdminDecisionSupportDepartmentItem {
  department: Department
  label: string
  facultyCount: number
  readinessScore: number
  riskScore: number
  severity: DecisionSupportSeverity
  topBlockers: string[]
  nextActionLabel: string
  href: string
}

export interface AdminDecisionSupportSummary {
  highRiskFacultyCount: number
  lowReadinessFacultyCount: number
  departmentsNeedingIntervention: number
  averageReadinessScore: number
  topFaculty: AdminDecisionSupportFacultyItem[]
  topDepartments: AdminDecisionSupportDepartmentItem[]
}

export interface AdminDecisionSupportPageData {
  summary: AdminDecisionSupportSummary
  faculty: AdminDecisionSupportFacultyItem[]
  departments: AdminDecisionSupportDepartmentItem[]
  config: DecisionSupportConfig
}

export interface AdminDashboardData {
  totalFaculty: number
  activeFaculty: number
  inactiveFaculty: number
  pendingInvites: number
  totalPublications: number
  indexedPublications: number
  totalEngagements: number
  activeEngagements: number
  totalResearchTitles: number
  ongoingResearchTitles: number
  avgCompletionScore: number
  departmentPerformance: AdminDepartmentPerformanceItem[]
  recentActivity: AdminRecentActivityItem[]
  pendingActions: AdminPendingActionItem[]
  decisionSupportSummary: AdminDecisionSupportSummary
}

export interface AdminPaginationMeta {
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface AdminSettingsBootstrapData {
  adminUsers: AdminUserListItem[]
  invites: FacultyInviteRecord[]
  inactiveFaculty: AdminFacultyListItem[]
  broadcasts: AdminBroadcastRecord[]
  decisionSupportConfig: DecisionSupportConfig
  decisionSupportDefaults: DecisionSupportConfig
}

export interface AdminFacultyListItem {
  id: string
  recordType: 'user' | 'invite'
  email: string
  name: string | null
  department: Department | null
  specialization: string | null
  employment_status: EmploymentStatus | null
  roles: UserRole[]
  access_status: AccessStatus | null
  invite_status: FacultyInviteStatus | null
  linked_user_id: string | null
  photo_url: string | null
  completion_score: number | null
  education_count: number
  publications_count: number
  indexed_publications_count: number
  engagements_count: number
  research_titles_count: number
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface AdminFacultyListQuery {
  search?: string
  department?: Department | 'all'
  status?: 'active' | 'pending' | 'inactive' | 'all'
  page?: number
  page_size?: number
}

export interface AdminFacultyListStats {
  total: number
  active: number
  pending: number
  avgCompletion: number
}

export interface AdminFacultyListResponse extends AdminPaginationMeta {
  items: AdminFacultyListItem[]
  stats: AdminFacultyListStats
}

export interface FacultyInvitePayload {
  email: string
  name?: string | null
  department?: Department | null
  employment_status?: EmploymentStatus | null
  roles?: UserRole[]
}

export interface FacultyInviteRecord {
  id: string
  email: string
  name: string | null
  department: Department | null
  employment_status: EmploymentStatus | null
  invite_status: FacultyInviteStatus
  linked_user_id: string | null
  created_by_user_id: string | null
  roles: UserRole[]
  created_at: string
  updated_at: string
}

export interface AdminUserListItem {
  id: string
  email: string
  name: string
  roles: UserRole[]
  access_status: AccessStatus
  last_login_at: string | null
  created_at: string
  updated_at: string
  photo_url: string | null
}

export interface AdminFacultyDetail {
  profile: Profile
  roles: UserRole[]
  access_status: AccessStatus
  completion: ProfileCompletionStatus
  education: EducationEntry[]
  publications: Publication[]
  engagements: Engagement[]
  researchTitles: ResearchTitle[]
}

export interface AdminPublicationItem extends Publication {
  faculty_id: string
  faculty_name: string
  faculty_email: string
  faculty_avatar_url: string | null
  department: Department | null
}

export interface AdminPublicationListQuery {
  search?: string
  type?: PublicationType | 'all'
  year?: string | 'all'
  indexing?: string | 'all'
  page?: number
  page_size?: number
}

export interface AdminPublicationListStats {
  total: number
  indexed: number
  thisYear: number
  totalCitations: number
}

export interface AdminPublicationListResponse extends AdminPaginationMeta {
  items: AdminPublicationItem[]
  stats: AdminPublicationListStats
  available_years: number[]
}

export interface AdminEngagementItem extends Engagement {
  faculty_id: string
  faculty_name: string
  faculty_email: string
  faculty_avatar_url: string | null
  department: Department | null
}

export interface AdminEngagementListQuery {
  search?: string
  type?: EngagementType | 'all'
  status?: EngagementStatus | 'all'
  page?: number
  page_size?: number
}

export interface AdminEngagementListStats {
  total: number
  ongoing: number
  completed: number
  beneficiaries: number
}

export interface AdminEngagementListResponse extends AdminPaginationMeta {
  items: AdminEngagementItem[]
  stats: AdminEngagementListStats
}

export interface AdminResearchTitleItem extends ResearchTitle {
  faculty_id: string
  faculty_name: string
  faculty_email: string
  faculty_avatar_url: string | null
  department: Department | null
}

export interface AdminResearchListQuery {
  search?: string
  status?: ResearchStatus | 'all'
  page?: number
  page_size?: number
}

export interface AdminResearchListStats {
  total: number
  ongoing: number
  completed: number
  totalFunding: number
}

export interface AdminResearchListResponse extends AdminPaginationMeta {
  items: AdminResearchTitleItem[]
  stats: AdminResearchListStats
}

export interface AdminDepartmentDetailQuery {
  department: Department
  search?: string
  status?: 'active' | 'pending' | 'inactive' | 'all'
  page?: number
  page_size?: number
}

export interface AdminDepartmentDetailStats {
  faculty: number
  activeFaculty: number
  inactiveFaculty: number
  pendingInvites: number
  incompleteProfiles: number
  facultyNeedingAction: number
  facultyWithoutPublications: number
  avgCompletion: number
  readyForReporting: number
}

export interface AdminDepartmentComplianceFacultyItem {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  accessStatus: AccessStatus
  lastLoginAt: string | null
  complianceScore: number
  priorityScore: number
  severity: DecisionSupportSeverity
  href: string
}

export interface AdminDepartmentComplianceSummary {
  complianceScore: number
  priorityScore: number
  severity: DecisionSupportSeverity
  highPriorityFacultyCount: number
  lowComplianceFacultyCount: number
}

export interface AdminDepartmentComplianceAnalytics {
  summary: AdminDepartmentComplianceSummary
  faculty: AdminDepartmentComplianceFacultyItem[]
}

export interface AdminDepartmentDetailResponse {
  summary: AdminDepartmentPerformanceItem
  roster: AdminFacultyListResponse
  stats: AdminDepartmentDetailStats
  complianceAnalytics: AdminDepartmentComplianceAnalytics
}

export interface AdminAnalyticsSummary {
  totalPublications: number
  indexedPublications: number
  avgPublicationsPerFaculty: number
  totalResearchTitles: number
  publicationsByYear: Array<{
    year: number
    publications: number
  }>
  publicationsByType: Array<{
    name: string
    value: number
  }>
  departmentPerformance: AdminDepartmentPerformanceItem[]
  sdgDistribution: Array<{
    goal: string
    count: number
  }>
  indexingDistribution: Array<{
    name: string
    count: number
  }>
}
