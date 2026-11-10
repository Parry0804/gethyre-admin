/**
 * API contract between the admin panel and the backend.
 * Field names follow the GetHyre database schema (17 tables) plus the new admin tables
 * listed in db/migrations/001_admin_panel.sql. The backend must return exactly these shapes.
 * All times are ISO 8601 strings in UTC. All ids are UUID strings.
 */

export type ISODate = string;

// ---------- Auth ----------
export interface Admin {
  id: string;
  username: string;
  full_name: string;
  role: 'super_admin';
}
export interface LoginRequest { username: string; password: string }
/** 401 body when the password is wrong. */
export interface LoginFailed { error: 'invalid_credentials'; tries_left: number }
/** 423 body when sign-in is locked after 5 wrong tries. */
export interface LoginLocked { error: 'locked'; locked_until: ISODate }

// ---------- Shared ----------
export interface Page<T> { items: T[]; total: number; page: number; page_size: number }
export type Plan = 'free' | 'pro';
export type UserStatus = 'active' | 'suspended';
export interface UserSummary {
  id: string;
  full_name: string | null;
  location: string | null;
  target_role: string | null;
}

// ---------- Users (users, users_profile, auth_providers) ----------
export interface UserRow extends UserSummary {
  phone: string | null;
  email: string | null;
  status: UserStatus;
  plan: Plan;
  has_completed_onboarding: boolean;
  created_at: ISODate;
  last_login_at: ISODate | null;
}
export interface UserProfile {
  current_job_title: string | null;
  location: string | null;
  months_of_experience: number | null;
  target_role: string[];
}
export interface User extends UserRow {
  phone_verified: boolean;
  email_verified: boolean;
  auth_providers: Array<'phone' | 'google' | 'linkedin'>;
  profile: UserProfile | null;
  suspension: { by: string; at: ISODate; reason: string } | null;
}

// ---------- Resumes (resumes, resume_insights) ----------
export type ResumeStatus = 'pending' | 'processing' | 'parsed' | 'failed' | 'draft' | 'saved';
export interface AtsScore {
  overall: number;
  formatting: number;
  completeness: number;
  contact_info: number;
  work_history: number;
  impact_quality: number;
  impact_issues: string[];
  formatting_issues: string[];
  missing_sections: string[];
}
export interface ResumeInsights {
  resume_summary: string;
  ats_score: AtsScore;
  strengths: string[];
  gaps: string[];
  skills: string[];
}
export interface Resume {
  id: string;
  user: UserSummary;
  title: string | null;
  original_file_name: string | null;
  source: 'uploaded' | 'generated';
  status: ResumeStatus;
  claimed_file_type: string | null;
  verified_file_type: string | null;
  error_message: string | null;
  /** New column: how many times parsing has been tried (max 3). */
  attempts: number;
  s3_key: string | null;
  created_at: ISODate;
  updated_at: ISODate;
  insights: ResumeInsights | null;
}

// ---------- Interviews (interview_sessions, interview_exchanges) ----------
export type InterviewStatus =
  | 'not_started' | 'preparing' | 'ready_for_interview' | 'in_progress' | 'complete' | 'fail' | 'abandoned';
export interface Verdict {
  tier: 'strong' | 'partial' | 'weak';
  signal_saturated: boolean;
  covered: string[];
  missed: string[];
  opened_threads: string[];
}
export interface Exchange {
  id: string;
  sequence: number;
  topic: string | null;
  question: string;
  question_type: 'recall' | 'applied';
  answer: string | null;
  verdict: Verdict | null;
  created_at: ISODate;
}
export interface ReportQuestion { sequence: number; topic: string; question: string; score: number; note: string }
export interface InterviewReport {
  overall_score: number;
  overall_summary: string;
  dimensions: Array<{ name: string; score: number; note: string }>;
  strengths: string[];
  focus_areas: string[];
  question_breakdown: ReportQuestion[];
}
export interface InterviewRow {
  id: string;
  user: UserSummary;
  target_role: string | null;
  level: string | null;
  status: InterviewStatus;
  question_budget: number;
  questions_asked: number;
  overall_score: number | null;
  error: string | null;
  attempts: number;
  created_at: ISODate;
  completed_at: ISODate | null;
  last_activity_at: ISODate | null;
}
export interface Interview extends InterviewRow {
  jd_text: string | null;
  report: InterviewReport | null;
  exchanges: Exchange[];
}

// ---------- Career plans (career_plans, career_plan_task_completions) ----------
export type CareerPlanStatus = 'generating' | 'ready' | 'failed' | 'superseded';
export interface CareerPlan {
  id: string;
  target_role: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  months: number;
  hours_per_week: number;
  status: CareerPlanStatus;
  error: string | null;
  attempts: number;
  completed_tasks: number;
  total_tasks: number;
  streak_days: number;
  created_at: ISODate;
}

// ---------- Sign-in codes (otp_requests) ----------
export interface OtpRequest {
  id: string;
  purpose: 'signup' | 'login' | 'verify' | 'reset_password';
  attempts: number;
  created_at: ISODate;
  consumed_at: ISODate | null;
  expires_at: ISODate;
}

// ---------- Plans, payments, limits (new tables) ----------
export type Feature = 'mock_interview' | 'cv_generation';
export interface Subscription {
  plan: Plan;
  status: 'active' | 'expired' | 'cancelled';
  started_at: ISODate;
  ends_at: ISODate | null;
}
export type PaymentStatus = 'paid' | 'failed' | 'pending' | 'refunded';
export interface Payment {
  id: string;
  user: UserSummary;
  plan: Plan;
  /** Amount in paise. null until pricing is final. */
  amount_paise: number | null;
  status: PaymentStatus;
  method: 'upi' | 'card' | 'netbanking' | null;
  provider_reference: string;
  failure_reason: string | null;
  created_at: ISODate;
}
export interface Usage { feature: Feature; used: number; plan_limit: number | null; extra: number }
export interface PlanLimit {
  plan: Plan;
  feature: Feature;
  /** null = no limit set yet. */
  limit: number | null;
  resets: 'never' | 'monthly' | 'plan_period';
  enabled: boolean;
  users_at_limit: number;
}
export interface LimitOverride {
  id: string;
  user: UserSummary & { plan: Plan };
  feature: Feature;
  extra: number;
  reason: string;
  ends_at: ISODate | null;
  set_by: string;
  created_at: ISODate;
}
export interface LimitsResponse {
  plan_users: Record<Plan, number>;
  limits: PlanLimit[];
  overrides: LimitOverride[];
}
export interface ExtraUsesRequest { feature: Feature; extra: number; ends_at: ISODate | null; reason: string }

// ---------- User detail ----------
export interface UserDetail {
  user: User;
  subscription: Subscription | null;
  usage: Usage[];
  payments: Payment[];
  resumes: Resume[];
  interviews: InterviewRow[];
  career_plan: CareerPlan | null;
  otp_requests: OtpRequest[];
}

// ---------- Jobs ----------
export type JobKind = 'resume' | 'interview_report' | 'career_plan';
export interface FailedJob {
  kind: JobKind;
  id: string;
  user: UserSummary;
  reason: string;
  attempts: number;
  max_attempts: number;
  /** failed = can retry; stuck = running too long; retrying = just retried; limit = used all tries. */
  state: 'failed' | 'stuck' | 'retrying' | 'limit';
  since: ISODate;
}

// ---------- Overview ----------
export interface Overview {
  stats: {
    total_users: number;
    new_this_month: number;
    signups_this_week: number;
    signups_last_week: number;
    interviews_finished_7d: number;
    avg_score_7d: number | null;
    resume_read_rate: number;
    resumes_failed_7d: number;
  };
  signups_14d: Array<{ date: string; count: number }>;
  newest_users: Array<UserSummary & { created_at: ISODate }>;
  failed_jobs: FailedJob[];
  payment_issues: Payment[];
}

// ---------- Exports ----------
export type ExportData = 'users' | 'resumes' | 'interviews' | 'career_plans' | 'payments' | 'otp_requests';
export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'json';
export interface ExportFilters { plan: Plan | 'all'; status: UserStatus | 'all'; signed_up_from: ISODate | null }
export interface ExportRequest { data: ExportData[]; filters: ExportFilters; format: ExportFormat; include_contacts: boolean }
export interface ExportJob {
  id: string;
  name: string;
  data: ExportData[];
  format: ExportFormat;
  include_contacts: boolean;
  status: 'preparing' | 'ready' | 'failed' | 'expired';
  progress: number;
  rows: number;
  error: string | null;
  created_by: string;
  created_at: ISODate;
  expires_at: ISODate | null;
  download_url: string | null;
}
