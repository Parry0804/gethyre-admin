import type { Feature, JobKind, Plan } from '@/api/types';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ist = (d: string | number) => new Date(new Date(d).getTime() + 5.5 * 3_600_000);

/** 9 Nov 2026 (India time) */
export const date = (d: string | null | undefined) => { if (!d) return '—'; const x = ist(d); return `${x.getUTCDate()} ${MON[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };
/** 9 Nov, 16:05 (India time) */
export const dateTime = (d: string | null | undefined) => { if (!d) return '—'; const x = ist(d); return `${x.getUTCDate()} ${MON[x.getUTCMonth()]}, ${String(x.getUTCHours()).padStart(2, '0')}:${String(x.getUTCMinutes()).padStart(2, '0')}`; };
export const ago = (d: string | null | undefined) => {
  if (!d) return 'never';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const days = Math.floor(s / 86400);
  return days === 1 ? 'Yesterday' : days < 7 ? `${days} d ago` : date(d);
};
export const initials = (n: string | null | undefined) => (n ?? '?').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
export const n = (x: number) => x.toLocaleString('en-IN');
export const money = (paise: number | null) => (paise == null ? '₹[price]' : `₹${(paise / 100).toLocaleString('en-IN')}`);

export const PLAN_LABEL: Record<Plan, string> = { free: 'Free', pro: 'Pro' };
export const FEATURE_LABEL: Record<Feature, string> = { mock_interview: 'Mock interview', cv_generation: 'CV generation and optimization' };
export const JOB_LABEL: Record<JobKind, string> = { resume: 'Resume', interview_report: 'Interview report', career_plan: 'Career plan' };
export const RESETS_LABEL = { never: 'Never (one-time)', monthly: 'Every month', plan_period: 'Every plan period' } as const;
