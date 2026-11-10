import type * as A from './types';

/** Base URL of the backend. Empty = same domain as the admin panel. */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`Request failed with ${status}`);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include', // the backend keeps the admin session in an httpOnly cookie
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/admin/auth/')) window.dispatchEvent(new Event('admin:signed-out'));
    throw new ApiError(res.status, data);
  }
  return data as T;
}

const qs = (p: Record<string, string | number | undefined | null>) => {
  const s = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && v !== 'all' && s.set(k, String(v)));
  const out = s.toString();
  return out ? `?${out}` : '';
};

export const api = {
  // auth
  login: (b: A.LoginRequest) => request<{ admin: A.Admin }>('POST', '/admin/auth/login', b),
  logout: () => request<null>('POST', '/admin/auth/logout'),
  me: () => request<{ admin: A.Admin }>('GET', '/admin/auth/me'),

  // overview and jobs
  overview: () => request<A.Overview>('GET', '/admin/overview'),
  retryJob: (kind: A.JobKind, id: string) => request<{ job: A.FailedJob }>('POST', `/admin/jobs/${kind}/${id}/retry`),
  retryAll: () => request<{ queued: number }>('POST', '/admin/jobs/retry-all'),

  // users
  search: (q: string) => request<{ items: A.UserRow[] }>('GET', `/admin/search${qs({ q })}`),
  users: (p: { q?: string; status?: string; plan?: string; sort?: string; page?: number }) =>
    request<A.Page<A.UserRow>>('GET', `/admin/users${qs(p)}`),
  user: (id: string) => request<A.UserDetail>('GET', `/admin/users/${id}`),
  suspend: (id: string, reason: string) => request<{ user: A.User }>('POST', `/admin/users/${id}/suspend`, { reason }),
  reactivate: (id: string) => request<{ user: A.User }>('POST', `/admin/users/${id}/reactivate`),
  extraUses: (id: string, b: A.ExtraUsesRequest) => request<{ override: A.LimitOverride }>('POST', `/admin/users/${id}/extra-uses`, b),

  // resumes and interviews
  resumes: (p: { status?: string; q?: string; page?: number }) => request<A.Page<A.Resume> & { counts: Record<string, number> }>('GET', `/admin/resumes${qs(p)}`),
  resume: (id: string) => request<A.Resume>('GET', `/admin/resumes/${id}`),
  interviews: (p: { status?: string; role?: string; page?: number }) => request<A.Page<A.InterviewRow> & { counts: Record<string, number> }>('GET', `/admin/interviews${qs(p)}`),
  interview: (id: string) => request<A.Interview>('GET', `/admin/interviews/${id}`),

  // payments, limits
  payments: (p: { status?: string; q?: string; page?: number }) =>
    request<A.Page<A.Payment> & { counts: Record<string, number>; summary: { pro_users: number; free_users: number; paid_this_month: number; failed_7d: number } }>('GET', `/admin/payments${qs(p)}`),
  limits: () => request<A.LimitsResponse>('GET', '/admin/limits'),
  saveLimits: (plan: A.Plan, limits: Array<Pick<A.PlanLimit, 'feature' | 'limit' | 'resets' | 'enabled'>>) =>
    request<A.LimitsResponse>('PUT', `/admin/limits/${plan}`, { limits }),
  removeOverride: (id: string) => request<null>('DELETE', `/admin/limit-overrides/${id}`),

  // exports
  exports: () => request<{ items: A.ExportJob[]; matching_users: number }>('GET', '/admin/exports'),
  countUsers: (f: A.ExportFilters) => request<{ count: number }>('GET', `/admin/users/count${qs({ plan: f.plan, status: f.status, signed_up_from: f.signed_up_from })}`),
  createExport: (b: A.ExportRequest) => request<{ export: A.ExportJob }>('POST', '/admin/exports', b),
  downloadUrl: (job: A.ExportJob) => `${API_BASE}${job.download_url}`,
};
