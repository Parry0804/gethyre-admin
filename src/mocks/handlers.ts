/**
 * Fake API used while the real backend is not connected (VITE_USE_MOCKS=true).
 * Each handler follows the contract in src/api/types.ts and docs/API.md,
 * so switching to the real backend needs no changes in the screens.
 */
import { http, HttpResponse, delay } from 'msw';
import type * as A from '@/api/types';
import { db, summary, userById, usageFor, uuid, time, type DbUser } from './db';

const { MIN, DAY, iso } = time;
const now = () => Date.now();
const PAGE = 25;
const MOCK_PASSWORD = 'gethyre-demo';
const SESSION_KEY = 'gethyre-admin-mock-session';

const session = {
  get: () => { try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; } },
  set: (v: boolean) => { try { v ? sessionStorage.setItem(SESSION_KEY, '1') : sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } },
};
const unauth = () => HttpResponse.json({ error: 'not_signed_in' }, { status: 401 });
const guard = () => (session.get() ? null : unauth());
const page = <T,>(items: T[], p: number) => ({ items: items.slice((p - 1) * PAGE, p * PAGE), total: items.length, page: p, page_size: PAGE });
const num = (u: URL, k: string, d = 1) => Number(u.searchParams.get(k) ?? d) || d;

const toRow = (u: DbUser): A.UserRow => ({ ...summary(u), phone: u.phone, email: u.email, status: u.status, plan: u.plan, has_completed_onboarding: u.has_completed_onboarding, created_at: u.created_at, last_login_at: u.last_login_at });
const toInterviewRow = ({ exchanges: _e, report: _r, jd_text: _j, user_id: _u, ...row }: (typeof db.interviews)[number]): A.InterviewRow => row;
const strip = <T extends { user_id?: string | null }>(x: T) => { const { user_id: _u, ...rest } = x; return rest; };

function failedJobs(): A.FailedJob[] {
  const jobs: A.FailedJob[] = [];
  const state = (id: string, failed: boolean, attempts: number): A.FailedJob['state'] => (db.retrying.has(id) ? 'retrying' : failed && attempts >= 3 ? 'limit' : failed ? 'failed' : 'stuck');
  for (const r of db.resumes) {
    const stuck = (r.status === 'processing' || r.status === 'pending') && now() - Date.parse(r.updated_at) > 15 * MIN;
    if ((r.status === 'failed' || stuck || db.retrying.has(r.id)) && !db.known.has(r.id))
      jobs.push({ kind: 'resume', id: r.id, user: r.user, reason: stuck ? `Still reading after ${Math.round((now() - Date.parse(r.updated_at)) / MIN)} minutes.` : r.error_message ?? '', attempts: r.attempts, max_attempts: 3, state: state(r.id, r.status === 'failed', r.attempts), since: r.updated_at });
  }
  for (const i of db.interviews) if (i.status === 'fail' || db.retrying.has(i.id))
    jobs.push({ kind: 'interview_report', id: i.id, user: i.user, reason: i.error ?? '', attempts: i.attempts, max_attempts: 3, state: state(i.id, i.status === 'fail', i.attempts), since: i.completed_at ?? i.created_at });
  for (const p of db.plans) if (p.status === 'failed' || db.retrying.has(p.id)) {
    const u = userById(p.user_id)!;
    jobs.push({ kind: 'career_plan', id: p.id, user: summary(u), reason: p.error ?? '', attempts: p.attempts, max_attempts: 3, state: state(p.id, p.status === 'failed', p.attempts), since: p.created_at });
  }
  return jobs.sort((a, b) => Date.parse(b.since) - Date.parse(a.since));
}

function retry(kind: A.JobKind, id: string): A.FailedJob | null {
  const ok = Math.random() < 0.75;
  if (kind === 'resume') {
    const r = db.resumes.find((x) => x.id === id); if (!r || r.attempts >= 3) return null;
    db.retrying.set(id, now()); r.status = 'pending'; r.updated_at = iso(now());
    setTimeout(() => { db.retrying.delete(id); r.attempts++; r.updated_at = iso(now());
      if (ok && r.claimed_file_type === r.verified_file_type) { r.status = 'parsed'; r.error_message = null; r.title = `${r.user.full_name?.split(' ')[0]}'s resume`; r.insights = { resume_summary: `${r.user.full_name} is aiming for ${r.user.target_role} roles.`, ats_score: { overall: 68, formatting: 74, completeness: 80, contact_info: 100, work_history: 62, impact_quality: 50, impact_issues: [], formatting_issues: [], missing_sections: [] }, strengths: ['Clear sections and contact details.'], gaps: ['Add measured results to projects.'], skills: [] }; }
      else { r.status = 'failed'; r.error_message = r.claimed_file_type !== r.verified_file_type ? r.error_message : 'Still could not read the file. Ask for a text-based PDF.'; }
    }, 2500);
  } else if (kind === 'interview_report') {
    const i = db.interviews.find((x) => x.id === id); if (!i || i.attempts >= 3) return null;
    db.retrying.set(id, now()); i.status = 'preparing';
    setTimeout(() => { db.retrying.delete(id); i.attempts++; if (ok) { i.status = 'complete'; i.error = null; i.overall_score = 55; i.report = { overall_score: 55, overall_summary: 'A mixed interview. Strong on topics the candidate has used directly.', dimensions: ['Content', 'Relevance', 'Problem-solving', 'Clarity'].map((n) => ({ name: n, score: 55, note: '' })), strengths: ['Gave real examples.'], focus_areas: ['Add measured results to every story.'], question_breakdown: i.exchanges.filter((e) => e.topic).map((e) => ({ sequence: e.sequence, topic: e.topic!, question: e.question, score: 55, note: 'On topic.' })) }; } else { i.status = 'fail'; i.error = 'Report took too long to write.'; } }, 2500);
  } else {
    const p = db.plans.find((x) => x.id === id); if (!p || p.attempts >= 3) return null;
    db.retrying.set(id, now()); p.status = 'generating';
    setTimeout(() => { db.retrying.delete(id); p.attempts++; if (ok) { p.status = 'ready'; p.error = null; } else { p.status = 'failed'; p.error = 'Plan was too long to finish in one go.'; } }, 2500);
  }
  return failedJobs().find((j) => j.id === id) ?? null;
}

function userFilter(u: URL) {
  const q = (u.searchParams.get('q') ?? '').trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const status = u.searchParams.get('status');
  const plan = u.searchParams.get('plan');
  const from = u.searchParams.get('signed_up_from');
  return db.users.filter((x) =>
    (!status || x.status === status) && (!plan || x.plan === plan) && (!from || x.created_at >= from) &&
    (!q || x.full_name?.toLowerCase().includes(q) || x.id.startsWith(q) || x.email?.toLowerCase().includes(q) || (digits.length >= 4 && x.phone?.replace(/\D/g, '').includes(digits))));
}

export const handlers = [
  // ---------- auth ----------
  http.post('*/admin/auth/login', async ({ request }) => {
    await delay(400);
    if (db.auth.lockedUntil > now()) return HttpResponse.json({ error: 'locked', locked_until: iso(db.auth.lockedUntil) }, { status: 423 });
    const b = (await request.json()) as A.LoginRequest;
    if (b.username.trim().toLowerCase() === db.admin.username && b.password === MOCK_PASSWORD) { db.auth.failed = 0; session.set(true); return HttpResponse.json({ admin: db.admin }); }
    db.auth.failed++;
    if (db.auth.failed >= 5) { db.auth.lockedUntil = now() + 15 * MIN; db.auth.failed = 0; return HttpResponse.json({ error: 'locked', locked_until: iso(db.auth.lockedUntil) }, { status: 423 }); }
    return HttpResponse.json({ error: 'invalid_credentials', tries_left: 5 - db.auth.failed }, { status: 401 });
  }),
  http.post('*/admin/auth/logout', () => { session.set(false); return HttpResponse.json(null); }),
  http.get('*/admin/auth/me', () => (session.get() ? HttpResponse.json({ admin: db.admin }) : unauth())),

  // ---------- overview and jobs ----------
  http.get('*/admin/overview', async () => {
    const g = guard(); if (g) return g; await delay(300);
    const t = now(), within = (d: string, ms: number) => t - Date.parse(d) < ms;
    const weekAgo = 7 * DAY;
    const uploads = db.resumes.filter((r) => r.source === 'uploaded');
    const finished = db.interviews.filter((i) => i.status === 'complete' && i.completed_at && within(i.completed_at, weekAgo));
    const days = Array.from({ length: 14 }, (_, k) => { const d = new Date(t - (13 - k) * DAY); const key = d.toISOString().slice(0, 10); return { date: key, count: db.users.filter((u) => u.created_at.slice(0, 10) === key).length }; });
    const body: A.Overview = {
      stats: {
        total_users: db.users.length,
        new_this_month: db.users.filter((u) => within(u.created_at, 30 * DAY)).length,
        signups_this_week: db.users.filter((u) => within(u.created_at, weekAgo)).length,
        signups_last_week: db.users.filter((u) => !within(u.created_at, weekAgo) && within(u.created_at, 2 * weekAgo)).length,
        interviews_finished_7d: finished.length,
        avg_score_7d: finished.length ? Math.round(finished.reduce((a, i) => a + (i.overall_score ?? 0), 0) / finished.length) : null,
        resume_read_rate: uploads.length ? uploads.filter((r) => r.status === 'parsed').length / uploads.length : 0,
        resumes_failed_7d: uploads.filter((r) => r.status === 'failed').length,
      },
      signups_14d: days,
      newest_users: [...db.users].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map((u) => ({ ...summary(u), created_at: u.created_at })),
      failed_jobs: failedJobs(),
      payment_issues: db.payments.filter((p) => (p.status === 'failed' || p.status === 'pending') && within(p.created_at, weekAgo)).map(strip),
    };
    return HttpResponse.json(body);
  }),
  http.post('*/admin/jobs/retry-all', async () => {
    const g = guard(); if (g) return g; await delay(300);
    const list = failedJobs().filter((j) => j.state === 'failed' || j.state === 'stuck');
    list.forEach((j) => retry(j.kind, j.id));
    return HttpResponse.json({ queued: list.length });
  }),
  http.post('*/admin/jobs/:kind/:id/retry', async ({ params }) => {
    const g = guard(); if (g) return g; await delay(300);
    const job = retry(params.kind as A.JobKind, params.id as string);
    return job ? HttpResponse.json({ job }) : HttpResponse.json({ error: 'retries_used_up' }, { status: 409 });
  }),

  // ---------- users ----------
  http.get('*/admin/search', async ({ request }) => {
    const g = guard(); if (g) return g; await delay(150);
    const u = new URL(request.url);
    return HttpResponse.json({ items: (u.searchParams.get('q') ?? '').trim().length < 2 ? [] : userFilter(u).slice(0, 5).map(toRow) });
  }),
  http.get('*/admin/users/count', async ({ request }) => { const g = guard(); if (g) return g; return HttpResponse.json({ count: userFilter(new URL(request.url)).length }); }),
  http.get('*/admin/users', async ({ request }) => {
    const g = guard(); if (g) return g; await delay(250);
    const u = new URL(request.url);
    const sort = u.searchParams.get('sort') ?? 'newest';
    const list = userFilter(u).sort((a, b) => (sort === 'last_active' ? (b.last_login_at ?? '').localeCompare(a.last_login_at ?? '') : sort === 'name' ? (a.full_name ?? '').localeCompare(b.full_name ?? '') : b.created_at.localeCompare(a.created_at)));
    return HttpResponse.json(page(list.map(toRow), num(u, 'page')));
  }),
  http.get('*/admin/users/:id', async ({ params }) => {
    const g = guard(); if (g) return g; await delay(250);
    const u = userById(params.id as string); if (!u) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const { _role: _r, ...user } = u;
    const body: A.UserDetail = {
      user, subscription: db.subs.get(u.id) ?? null, usage: usageFor(u),
      payments: db.payments.filter((p) => p.user_id === u.id).map(strip),
      resumes: db.resumes.filter((r) => r.user_id === u.id).map(strip),
      interviews: db.interviews.filter((i) => i.user_id === u.id).map(toInterviewRow),
      career_plan: (() => { const p = db.plans.filter((x) => x.user_id === u.id && x.status !== 'superseded').at(-1); return p ? strip(p) : null; })(),
      otp_requests: db.otps.filter((o) => o.user_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6).map(strip),
    };
    return HttpResponse.json(body);
  }),
  http.post('*/admin/users/:id/suspend', async ({ params, request }) => {
    const g = guard(); if (g) return g; await delay(300);
    const u = userById(params.id as string)!; const { reason } = (await request.json()) as { reason: string };
    u.status = 'suspended'; u.suspension = { by: db.admin.full_name, at: iso(now()), reason };
    return HttpResponse.json({ user: u });
  }),
  http.post('*/admin/users/:id/reactivate', async ({ params }) => {
    const g = guard(); if (g) return g; await delay(300);
    const u = userById(params.id as string)!; u.status = 'active'; u.suspension = null;
    return HttpResponse.json({ user: u });
  }),
  http.post('*/admin/users/:id/extra-uses', async ({ params, request }) => {
    const g = guard(); if (g) return g; await delay(300);
    const u = userById(params.id as string)!; const b = (await request.json()) as A.ExtraUsesRequest;
    const o = { id: uuid(), user_id: u.id, user: { ...summary(u), plan: u.plan }, feature: b.feature, extra: b.extra, reason: b.reason, ends_at: b.ends_at, set_by: db.admin.full_name, created_at: iso(now()) };
    db.overrides.push(o);
    return HttpResponse.json({ override: strip(o) });
  }),

  // ---------- resumes ----------
  http.get('*/admin/resumes/:id', async ({ params }) => { const g = guard(); if (g) return g; await delay(200); const r = db.resumes.find((x) => x.id === params.id); return r ? HttpResponse.json(strip(r)) : HttpResponse.json({ error: 'not_found' }, { status: 404 }); }),
  http.get('*/admin/resumes', async ({ request }) => {
    const g = guard(); if (g) return g; await delay(250);
    const u = new URL(request.url); const st = u.searchParams.get('status'); const q = (u.searchParams.get('q') ?? '').toLowerCase();
    const matches = (s: string | null) => db.resumes.filter((r) => (!s || (s === 'generated' ? r.source === 'generated' : s === 'processing' ? r.status === 'processing' || r.status === 'pending' : r.status === s)) && (!q || r.user.full_name?.toLowerCase().includes(q) || r.original_file_name?.toLowerCase().includes(q)));
    const counts = Object.fromEntries(['all', 'parsed', 'failed', 'processing', 'generated'].map((k) => [k, matches(k === 'all' ? null : k).length]));
    return HttpResponse.json({ ...page(matches(st).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(strip), num(u, 'page')), counts });
  }),

  // ---------- interviews ----------
  http.get('*/admin/interviews/:id', async ({ params }) => { const g = guard(); if (g) return g; await delay(200); const i = db.interviews.find((x) => x.id === params.id); return i ? HttpResponse.json(strip(i)) : HttpResponse.json({ error: 'not_found' }, { status: 404 }); }),
  http.get('*/admin/interviews', async ({ request }) => {
    const g = guard(); if (g) return g; await delay(250);
    const u = new URL(request.url); const st = u.searchParams.get('status'); const role = u.searchParams.get('role');
    const matches = (s: string | null) => db.interviews.filter((i) => (!s || i.status === s) && (!role || i.target_role === role));
    const counts = Object.fromEntries(['all', 'complete', 'in_progress', 'fail', 'abandoned'].map((k) => [k, matches(k === 'all' ? null : k).length]));
    return HttpResponse.json({ ...page(matches(st).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(toInterviewRow), num(u, 'page')), counts });
  }),

  // ---------- payments ----------
  http.get('*/admin/payments', async ({ request }) => {
    const g = guard(); if (g) return g; await delay(250);
    const u = new URL(request.url); const st = u.searchParams.get('status'); const q = (u.searchParams.get('q') ?? '').toLowerCase();
    const matches = (s: string | null) => db.payments.filter((p) => (!s || p.status === s) && (!q || p.user.full_name?.toLowerCase().includes(q) || p.provider_reference.includes(q)));
    const counts = Object.fromEntries(['all', 'paid', 'failed', 'pending', 'refunded'].map((k) => [k, matches(k === 'all' ? null : k).length]));
    const t = now();
    return HttpResponse.json({
      ...page(matches(st).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(strip), num(u, 'page')), counts,
      summary: { pro_users: db.users.filter((x) => x.plan === 'pro').length, free_users: db.users.filter((x) => x.plan === 'free').length, paid_this_month: db.payments.filter((p) => p.status === 'paid' && t - Date.parse(p.created_at) < 30 * DAY).length, failed_7d: db.payments.filter((p) => p.status === 'failed' && t - Date.parse(p.created_at) < 7 * DAY).length },
    });
  }),

  // ---------- limits ----------
  http.get('*/admin/limits', async () => { const g = guard(); if (g) return g; await delay(250); return HttpResponse.json(limitsBody()); }),
  http.put('*/admin/limits/:plan', async ({ params, request }) => {
    const g = guard(); if (g) return g; await delay(300);
    const { limits } = (await request.json()) as { limits: Array<Pick<A.PlanLimit, 'feature' | 'limit' | 'resets' | 'enabled'>> };
    for (const l of limits) { const row = db.limits.find((x) => x.plan === params.plan && x.feature === l.feature); if (row) Object.assign(row, l); }
    return HttpResponse.json(limitsBody());
  }),
  http.delete('*/admin/limit-overrides/:id', async ({ params }) => { const g = guard(); if (g) return g; db.overrides = db.overrides.filter((o) => o.id !== params.id); return HttpResponse.json(null); }),

  // ---------- exports ----------
  http.get('*/admin/exports/:id/download', ({ params }) => {
    const e = db.exports.find((x) => x.id === params.id);
    if (!e) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    if (e.format === 'json') return new HttpResponse(JSON.stringify({ note: 'Sample export from the fake API', users: db.users.slice(0, 20).map(toRow) }, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${e.name}.json"` } });
    if (e.format === 'csv') { const rows = db.users.slice(0, 50).map(toRow); const head = ['id', 'full_name', 'phone', 'email', 'plan', 'status', 'created_at']; const csv = [head.join(','), ...rows.map((r) => head.map((h) => JSON.stringify((r as unknown as Record<string, unknown>)[h] ?? '')).join(','))].join('\n'); return new HttpResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${e.name}.csv"` } }); }
    return new HttpResponse('Excel and PDF files are made by the real backend. The fake API only produces CSV and JSON samples.', { headers: { 'Content-Type': 'text/plain', 'Content-Disposition': `attachment; filename="${e.name}-sample.txt"` } });
  }),
  http.get('*/admin/exports', async () => { const g = guard(); if (g) return g; await delay(200); return HttpResponse.json({ items: [...db.exports].sort((a, b) => b.created_at.localeCompare(a.created_at)), matching_users: db.users.length }); }),
  http.post('*/admin/exports', async ({ request }) => {
    const g = guard(); if (g) return g; await delay(300);
    const b = (await request.json()) as A.ExportRequest;
    const label: Record<A.ExportData, string> = { users: 'Users', resumes: 'Resumes', interviews: 'Interviews', career_plans: 'Career plans', payments: 'Payments', otp_requests: 'Sign-in codes' };
    const who = b.filters.plan === 'all' ? 'All users' : b.filters.plan === 'pro' ? 'Pro users' : 'Free users';
    const rows = db.users.filter((u) => (b.filters.plan === 'all' || u.plan === b.filters.plan) && (b.filters.status === 'all' || u.status === b.filters.status)).length;
    const e: A.ExportJob = { id: uuid(), name: `${who} · ${b.data.map((d) => label[d]).join(', ')}`, data: b.data, format: b.format, include_contacts: b.include_contacts, status: 'preparing', progress: 0, rows, error: null, created_by: db.admin.full_name, created_at: iso(now()), expires_at: null, download_url: null };
    db.exports.push(e);
    const tick = setInterval(() => { e.progress = Math.min(100, e.progress + 25); if (e.progress >= 100) { clearInterval(tick); e.status = 'ready'; e.expires_at = iso(now() + 7 * DAY); e.download_url = `/admin/exports/${e.id}/download`; } }, 900);
    return HttpResponse.json({ export: e });
  }),
];

function limitsBody(): A.LimitsResponse {
  const plan_users = { free: db.users.filter((u) => u.plan === 'free').length, pro: db.users.filter((u) => u.plan === 'pro').length };
  const limits = db.limits.map((l) => ({ ...l, users_at_limit: l.limit == null ? 0 : db.users.filter((u) => u.plan === l.plan && (usageFor(u).find((x) => x.feature === l.feature)?.used ?? 0) >= l.limit!).length }));
  return { plan_users, limits, overrides: db.overrides.map(strip) };
}

