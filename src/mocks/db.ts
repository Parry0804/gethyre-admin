/**
 * In-memory sample data for the fake API. Shapes match src/api/types.ts.
 * Everything here is invented. It is only used when VITE_USE_MOCKS=true.
 */
import type * as A from '@/api/types';

let seed = 20261110;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const hex = (n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 16).toString(16)).join('');
export const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${pick(['8', '9', 'a', 'b'])}${hex(3)}-${hex(12)}`;

export const NOW = Date.now();
const MIN = 60_000, HR = 3_600_000, DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString();

const FIRST = ['Aarav', 'Ananya', 'Rohan', 'Ishita', 'Meera', 'Diya', 'Vivaan', 'Saanvi', 'Aditya', 'Kavya', 'Rahul', 'Pooja', 'Nikhil', 'Sneha', 'Karan', 'Siddharth', 'Varun', 'Neha', 'Yash', 'Aditi', 'Harsh', 'Shruti', 'Manav', 'Priya', 'Dev', 'Nisha', 'Omkar', 'Kunal', 'Pranav', 'Ritika', 'Sahil', 'Trisha', 'Gauri', 'Imran', 'Mihika', 'Nandini'];
const LAST = ['Sharma', 'Verma', 'Iyer', 'Nair', 'Reddy', 'Patel', 'Gupta', 'Kulkarni', 'Menon', 'Chatterjee', 'Joshi', 'Rao', 'Singh', 'Kapoor', 'Pillai', 'Shetty', 'Mishra', 'Agarwal', 'Bhat', 'Saxena', 'Dutta', 'Ghosh', 'Jain', 'Sinha'];
const CITY = ['Bengaluru', 'Pune', 'Hyderabad', 'Gurugram', 'Noida', 'Chennai', 'Mumbai', 'Kolkata', 'Jaipur', 'Kochi', 'Indore', 'Lucknow'];
export const ROLES = ['Backend Engineer', 'Frontend Engineer', 'Data Analyst', 'Product Designer', 'Product Manager', 'Data Scientist', 'DevOps Engineer', 'Android Developer', 'Business Analyst', 'QA Engineer'];
const TOPICS: Record<string, string[]> = {
  'Backend Engineer': ['REST APIs', 'PostgreSQL', 'Caching', 'Python', 'System design'],
  'Frontend Engineer': ['React', 'TypeScript', 'CSS layout', 'Web performance', 'Accessibility'],
  'Data Analyst': ['SQL', 'Power BI', 'Statistics', 'Excel', 'Python pandas'],
  'Product Designer': ['User research', 'Interaction design', 'Design systems', 'Prototyping', 'Usability testing'],
  'Product Manager': ['Prioritisation', 'Writing specs', 'Metrics', 'User research', 'Roadmapping'],
  'Data Scientist': ['Regression', 'Model evaluation', 'Feature engineering', 'SQL', 'Experiments'],
  'DevOps Engineer': ['Linux', 'Docker', 'Kubernetes', 'CI/CD', 'AWS'],
  'Android Developer': ['Kotlin', 'Jetpack Compose', 'App architecture', 'Offline storage', 'Performance'],
  'Business Analyst': ['Requirements', 'Process mapping', 'SQL basics', 'Excel modelling', 'User stories'],
  'QA Engineer': ['Test design', 'Selenium', 'API testing', 'Bug reports', 'Regression'],
};
const PARSE_ERRORS = ['Could not read the file. It may be a scanned image.', 'Word document sent as a PDF.', 'The file is password protected.', 'Text was empty after reading.'];
const REPORT_ERRORS = ['Report took too long to write.', 'The report did not come back in the right format.'];
const PLAN_ERRORS = ['Plan was too long to finish in one go.', 'Market research step took too long.'];

export interface DbUser extends A.User { _role: string }
export interface DbInterview extends A.Interview { user_id: string }
export interface DbResume extends A.Resume { user_id: string }
export interface DbPlan extends A.CareerPlan { user_id: string }
export interface DbPayment extends A.Payment { user_id: string }
export interface DbOtp extends A.OtpRequest { user_id: string | null }

export const db = {
  users: [] as DbUser[],
  resumes: [] as DbResume[],
  interviews: [] as DbInterview[],
  plans: [] as DbPlan[],
  payments: [] as DbPayment[],
  otps: [] as DbOtp[],
  subs: new Map<string, A.Subscription>(),
  overrides: [] as Array<A.LimitOverride & { user_id: string }>,
  limits: [] as Omit<A.PlanLimit, 'users_at_limit'>[],
  exports: [] as A.ExportJob[],
  known: new Set<string>(),
  retrying: new Map<string, number>(),
  admin: { id: uuid(), username: 'pranay', full_name: 'Pranay Pawar', role: 'super_admin' as const },
  auth: { failed: 0, lockedUntil: 0 },
};

export const summary = (u: DbUser): A.UserSummary => ({ id: u.id, full_name: u.full_name, location: u.profile?.location ?? null, target_role: u.profile?.target_role[0] ?? null });
export const userById = (id: string) => db.users.find((u) => u.id === id);

function makeUser(full: string, o: Partial<{ city: string; role: string; plan: A.Plan; status: A.UserStatus; onboarded: boolean; createdAgo: number; lastAgo: number; email: boolean; months: number }> = {}): DbUser {
  const [first, last] = full.split(' ');
  const role = o.role ?? pick(ROLES);
  const created = NOW - (o.createdAgo ?? Math.floor(120 * rnd() ** 2 * DAY));
  const onboarded = o.onboarded ?? rnd() < 0.8;
  const hasEmail = o.email ?? rnd() < 0.7;
  const u: DbUser = {
    id: uuid(), full_name: full, _role: role,
    phone: rnd() < 0.92 ? `+91 9${ri(1000, 9999)} ${ri(10000, 99999)}` : null,
    email: hasEmail ? `${first.toLowerCase()}.${last.toLowerCase()}${ri(1, 99)}@gmail.com` : null,
    phone_verified: true, email_verified: hasEmail,
    status: o.status ?? (rnd() < 0.03 ? 'suspended' : 'active'),
    plan: o.plan ?? (rnd() < 0.15 ? 'pro' : 'free'),
    has_completed_onboarding: onboarded,
    created_at: iso(created),
    last_login_at: iso(Math.max(created, NOW - (o.lastAgo ?? ri(0, 20 * 24) * HR))),
    location: o.city ?? pick(CITY), target_role: role,
    auth_providers: rnd() < 0.3 ? ['phone', 'google'] : ['phone'],
    profile: onboarded ? { current_job_title: pick(['Student', 'Intern', `Junior ${role}`]), location: o.city ?? pick(CITY), months_of_experience: o.months ?? ri(0, 36), target_role: [role] } : null,
    suspension: null,
  };
  if (u.profile) u.location = u.profile.location;
  if (u.status === 'suspended') u.suspension = { by: 'Pranay Pawar', at: iso(NOW - 2 * DAY), reason: 'Reported for sharing the account.' };
  db.users.push(u);
  db.subs.set(u.id, { plan: u.plan, status: 'active', started_at: u.created_at, ends_at: null });
  return u;
}

function makeResume(u: DbUser, o: Partial<DbResume> & { score?: number } = {}): DbResume {
  const status = o.status ?? (rnd() < 0.9 ? 'parsed' : 'failed');
  const created = NOW - ri(1, 200) * HR;
  const overall = o.score ?? ri(42, 90);
  const role = u._role;
  const r: DbResume = {
    id: uuid(), user_id: u.id, user: summary(u), source: 'uploaded', status,
    title: status === 'parsed' ? `${u.full_name!.split(' ')[0]}'s resume` : null,
    original_file_name: `${u.full_name!.split(' ')[0]}_Resume.pdf`,
    claimed_file_type: 'application/pdf', verified_file_type: 'application/pdf',
    error_message: status === 'failed' ? pick(PARSE_ERRORS) : null, attempts: 1,
    s3_key: `resumes/${u.id.slice(0, 8)}/${hex(12)}.pdf`, created_at: iso(created), updated_at: iso(created + 40_000),
    insights: status === 'parsed' ? {
      resume_summary: `${u.full_name} is aiming for ${role} roles, with hands-on work in ${TOPICS[role].slice(0, 2).join(' and ')}.`,
      ats_score: { overall, formatting: Math.min(100, overall + 8), completeness: Math.min(100, overall + 12), contact_info: 100, work_history: Math.max(20, overall - 8), impact_quality: Math.max(15, overall - 18), impact_issues: overall < 75 ? ['Project bullets have no numbers: add users, time saved or accuracy.'] : [], formatting_issues: overall < 65 ? ['Two-column skills section may merge into one line in some ATS parsers.'] : [], missing_sections: overall < 55 ? ['No summary section.'] : [] },
      strengths: [`Names real tools used for ${TOPICS[role][0]}.`, 'Contact details and links are complete.'],
      gaps: ['No measured results on projects.', `${TOPICS[role][2]} is expected for the role but not shown.`],
      skills: TOPICS[role].slice(0, 4),
    } : null,
    ...o,
  };
  db.resumes.push(r);
  return r;
}

const WARM = ['To start, tell me a little about yourself.', 'What made you interested in this kind of role?', 'What have you been learning recently?', 'Tell me about a project you enjoyed working on.'];
const ANS = {
  strong: 'I set it up so each step could be retried on its own, measured the time before and after, and it dropped from about 900 ms to 220 ms.',
  partial: 'I used it in my internship project and followed the existing pattern. I would need to look up the details again.',
  weak: "I'm not sure. I would have to check.",
};
function makeInterview(u: DbUser, status: A.InterviewStatus, o: Partial<DbInterview> & { skill?: number } = {}): DbInterview {
  const role = u._role;
  const created = NOW - (status === 'in_progress' ? 20 * MIN : ri(2, 240) * HR);
  const topics = TOPICS[role];
  const asked = status === 'complete' || status === 'fail' ? 15 : status === 'in_progress' ? 7 : status === 'abandoned' ? 0 : 0;
  const exchanges: A.Exchange[] = [];
  let seq = 1;
  const warm = status === 'abandoned' ? 4 : status === 'not_started' || status === 'preparing' || status === 'ready_for_interview' ? 0 : 4;
  for (let i = 0; i < warm; i++) exchanges.push({ id: uuid(), sequence: seq++, topic: null, question: WARM[i], question_type: 'recall', answer: 'Sure. I studied engineering and did one internship.', verdict: null, created_at: iso(created + seq * 2 * MIN) });
  const skill = o.skill ?? rnd();
  for (let i = 0; i < asked; i++) {
    const tier: A.Verdict['tier'] = rnd() < skill ? 'strong' : rnd() < 0.6 ? 'partial' : 'weak';
    const last = status === 'in_progress' && i === asked - 1;
    exchanges.push({ id: uuid(), sequence: seq++, topic: topics[Math.floor(i / 3) % topics.length], question: i % 3 === 0 ? `Walk me through how you have used ${topics[Math.floor(i / 3) % topics.length]} in your own work.` : pick(['What would you do differently next time?', 'How would that hold up with ten times the users?', 'How did you test that it worked?']), question_type: i % 2 ? 'applied' : 'recall', answer: last ? null : ANS[tier], verdict: last ? null : { tier, signal_saturated: rnd() < 0.4, covered: tier === 'weak' ? [] : ['Gave a real example'], missed: tier === 'strong' ? [] : ['No numbers on the result'], opened_threads: [] }, created_at: iso(created + seq * 2 * MIN) });
  }
  const scored = exchanges.filter((e) => e.topic && e.verdict);
  const sc = (t: A.Verdict['tier']) => (t === 'strong' ? ri(70, 90) : t === 'partial' ? ri(42, 66) : ri(8, 34));
  const qb = scored.map((e) => ({ sequence: e.sequence, topic: e.topic!, question: e.question, score: sc(e.verdict!.tier), note: e.verdict!.tier === 'strong' ? 'Clear and specific, with a measured result.' : e.verdict!.tier === 'partial' ? 'On topic. Add how you decided and what the result was.' : 'Little signal. Review the basics of this topic.' }));
  const overall = qb.length ? Math.round(qb.reduce((a, b) => a + b.score, 0) / qb.length) : 0;
  const it: DbInterview = {
    id: uuid(), user_id: u.id, user: summary(u), target_role: role, level: pick(['intern', 'new_grad', 'junior', 'mid']), status,
    question_budget: 15, questions_asked: asked, overall_score: status === 'complete' ? overall : null,
    error: status === 'fail' ? pick(REPORT_ERRORS) : null, attempts: status === 'fail' ? 1 : 1,
    created_at: iso(created), completed_at: status === 'complete' || status === 'fail' ? iso(created + 34 * MIN) : null,
    last_activity_at: iso(status === 'in_progress' ? NOW - 3 * MIN : created + 34 * MIN), jd_text: null, exchanges,
    report: status === 'complete' ? {
      overall_score: overall,
      overall_summary: overall >= 65 ? 'A solid interview. Most answers were specific and showed real hands-on work.' : overall >= 40 ? 'A mixed interview. Strong where the candidate has used the tools, thin elsewhere.' : 'An early-stage interview. Answers stayed at the level of names and definitions.',
      dimensions: ['Content', 'Relevance', 'Problem-solving', 'Clarity'].map((n) => ({ name: n, score: Math.max(5, Math.min(95, overall + ri(-12, 12))), note: { Content: 'Depth of technical knowledge.', Relevance: 'Stayed on what was asked.', 'Problem-solving': 'How applied questions were broken down.', Clarity: 'Structure and completeness.' }[n]! })),
      strengths: [`Gave a real example for ${topics[0]}.`, 'Kept answers short and on topic.'],
      focus_areas: topics.slice(-2).map((t) => `${t}: be ready with one concrete example and its trade-offs.`),
      question_breakdown: qb,
    } : null,
    ...o,
  };
  db.interviews.push(it);
  return it;
}

function makePlan(u: DbUser, status: A.CareerPlanStatus, o: Partial<DbPlan> = {}): DbPlan {
  const months = ri(2, 5);
  const p: DbPlan = { id: uuid(), user_id: u.id, target_role: u._role, level: pick(['beginner', 'intermediate']), months, hours_per_week: pick([5, 6, 8, 10, 12]), status, error: status === 'failed' ? pick(PLAN_ERRORS) : null, attempts: 1, completed_tasks: status === 'ready' ? ri(0, months * 6) : 0, total_tasks: months * 12, streak_days: status === 'ready' ? ri(0, 12) : 0, created_at: iso(NOW - (status === 'generating' ? 3 * MIN : ri(5, 400) * HR)), ...o };
  db.plans.push(p);
  return p;
}

function makePayment(u: DbUser, status: A.PaymentStatus, ago: number, o: Partial<DbPayment> = {}) {
  db.payments.push({ id: uuid(), user_id: u.id, user: summary(u), plan: 'pro', amount_paise: null, status, method: pick(['upi', 'card']), provider_reference: `pay_${hex(10)}`, failure_reason: status === 'failed' ? pick(['Card declined by the bank. No money taken.', 'UPI request expired before it was approved.']) : status === 'pending' ? 'UPI payment still pending.' : null, created_at: iso(NOW - ago), ...o });
}

// ---------- Named sample users (match the Figma designs) ----------
const riya = makeUser('Riya Menon', { city: 'Pune', role: 'Data Analyst', plan: 'pro', onboarded: true, createdAgo: 1 * DAY, lastAgo: 12 * MIN, email: true, months: 6 });
const kabir = makeUser('Kabir Malhotra', { city: 'Gurugram', role: 'Backend Engineer', plan: 'free', onboarded: true, createdAgo: 1 * DAY, lastAgo: HR, email: true, months: 14 });
const sneha = makeUser('Sneha Kulkarni', { city: 'Bengaluru', role: 'Product Designer', plan: 'free', onboarded: true, createdAgo: 2 * DAY, email: false });
const arjun = makeUser('Arjun Nair', { city: 'Kochi', role: 'Frontend Engineer', plan: 'pro', onboarded: true, createdAgo: 2 * DAY, lastAgo: 3 * HR });
makeUser('Rohan Deshpande', { city: 'Nagpur', role: 'DevOps Engineer', plan: 'free', onboarded: false, createdAgo: 5 * DAY, email: false });
const lavanya = makeUser('Lavanya Iyer', { city: 'Chennai', role: 'Business Analyst', plan: 'free', onboarded: true, createdAgo: 6 * DAY });
const mihir = makeUser('Mihir Shetty', { city: 'Bengaluru', role: 'QA Engineer', plan: 'pro', onboarded: true, createdAgo: 7 * DAY });
const zoya = makeUser('Zoya Qureshi', { city: 'Lucknow', role: 'Android Developer', plan: 'free', onboarded: true, createdAgo: 8 * DAY });
makeUser('Farhan Khan', { city: 'Hyderabad', role: 'Data Scientist', plan: 'free', status: 'suspended', onboarded: true, createdAgo: 4 * DAY });

makeResume(riya, { score: 74, created_at: iso(NOW - 26 * HR) });
makeResume(riya, { status: 'saved', source: 'generated', title: 'Data Analyst resume', original_file_name: null, insights: null });
makeResume(kabir, { status: 'failed', error_message: 'Could not read the file. It may be a scanned image.', original_file_name: 'Kabir_Malhotra_CV.pdf', insights: null, title: null, updated_at: iso(NOW - 2 * HR) });
makeResume(sneha, { status: 'processing', created_at: iso(NOW - 22 * MIN), updated_at: iso(NOW - 22 * MIN), insights: null, title: null, original_file_name: 'resume_final.pdf' });
makeResume(mihir, { status: 'failed', error_message: 'Word document sent as a PDF. Ask the user to upload a PDF.', verified_file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', original_file_name: 'mihir-resume.docx', insights: null, title: null, updated_at: iso(NOW - 26 * HR) });
makeResume(lavanya, { score: 58 });
makeResume(zoya, { score: 43 });
makeInterview(riya, 'complete', { skill: 0.55 });
makeInterview(riya, 'complete', { skill: 0.35 });
makeInterview(kabir, 'fail', { error: 'Report took too long to write.', attempts: 2 });
makeInterview(arjun, 'in_progress');
makeInterview(lavanya, 'fail', { error: 'Report took too long to write, 3 times.', attempts: 3 });
makeInterview(zoya, 'abandoned');
makePlan(riya, 'ready', { completed_tasks: 15, total_tasks: 36, streak_days: 9, months: 3, hours_per_week: 6 });
makePlan(arjun, 'failed', { error: 'Plan was too long to finish in one go.' });
makePayment(riya, 'paid', 26 * HR);
makePayment(kabir, 'failed', 20 * HR, { method: 'card', failure_reason: 'Card declined by the bank. No money taken.' });
makePayment(lavanya, 'pending', 2 * DAY, { method: 'upi' });
makePayment(arjun, 'paid', 2 * DAY);
makePayment(mihir, 'refunded', 7 * DAY, { failure_reason: null });
for (const [t, ok, att] of [[10 * MIN, 0, 5], [18 * MIN, 0, 2], [27 * MIN, 0, 0], [26 * HR, 1, 0]] as const)
  db.otps.push({ id: uuid(), user_id: kabir.id, purpose: 'login', attempts: att, created_at: iso(NOW - t), consumed_at: ok ? iso(NOW - t + 40_000) : null, expires_at: iso(NOW - t + 10 * MIN) });

// ---------- Random users to fill lists ----------
for (let i = 0; i < 140; i++) {
  const u = makeUser(`${pick(FIRST)} ${pick(LAST)}`);
  if (!u.has_completed_onboarding) continue;
  if (rnd() < 0.8) makeResume(u);
  const n = ri(0, 2);
  for (let k = 0; k < n; k++) makeInterview(u, rnd() < 0.8 ? 'complete' : rnd() < 0.5 ? 'abandoned' : 'not_started');
  if (rnd() < 0.5) makePlan(u, 'ready');
  if (u.plan === 'pro') makePayment(u, 'paid', ri(1, 60) * DAY);
  for (let k = 0; k < ri(1, 3); k++) { const t = ri(1, 7 * 24) * HR; db.otps.push({ id: uuid(), user_id: u.id, purpose: pick(['login', 'login', 'signup']), attempts: ri(0, 1), created_at: iso(NOW - t), consumed_at: iso(NOW - t + 30_000), expires_at: iso(NOW - t + 10 * MIN) }); }
}
for (const u of db.users) if (u.phone && !db.otps.some((o) => o.user_id === u.id)) db.otps.push({ id: uuid(), user_id: u.id, purpose: 'signup', attempts: 0, created_at: u.created_at, consumed_at: u.created_at, expires_at: u.created_at });

db.limits = [
  { plan: 'free', feature: 'mock_interview', limit: 1, resets: 'never', enabled: true },
  { plan: 'free', feature: 'cv_generation', limit: 3, resets: 'never', enabled: true },
  { plan: 'pro', feature: 'mock_interview', limit: null, resets: 'plan_period', enabled: true },
  { plan: 'pro', feature: 'cv_generation', limit: null, resets: 'plan_period', enabled: true },
];
db.overrides.push({ id: uuid(), user_id: lavanya.id, user: { ...summary(lavanya), plan: 'free' }, feature: 'mock_interview', extra: 1, reason: 'Her report failed 3 times.', ends_at: iso(NOW + 30 * DAY), set_by: 'Pranay Pawar', created_at: iso(NOW - DAY) });

db.exports.push(
  { id: uuid(), name: 'Pro users · Plans and payments', data: ['payments'], format: 'csv', include_contacts: false, status: 'ready', progress: 100, rows: 212, error: null, created_by: 'Pranay Pawar', created_at: iso(NOW - 2 * DAY), expires_at: iso(NOW + 5 * DAY), download_url: '' },
  { id: uuid(), name: 'Everything', data: ['users', 'resumes', 'interviews', 'career_plans', 'payments', 'otp_requests'], format: 'json', include_contacts: true, status: 'failed', progress: 40, rows: 1402, error: 'Stopped: the file was over the size limit.', created_by: 'Pranay Pawar', created_at: iso(NOW - 13 * DAY), expires_at: null, download_url: null },
);
db.exports.forEach((e) => { if (e.status === 'ready') e.download_url = `/admin/exports/${e.id}/download`; });

/** Count CV generations and interviews per user for usage. */
export function usageFor(u: DbUser): A.Usage[] {
  const lim = (f: A.Feature) => db.limits.find((l) => l.plan === u.plan && l.feature === f)?.limit ?? null;
  const extra = (f: A.Feature) => db.overrides.filter((o) => o.user_id === u.id && o.feature === f).reduce((a, o) => a + o.extra, 0);
  return [
    { feature: 'mock_interview', used: db.interviews.filter((i) => i.user_id === u.id && i.status !== 'not_started').length, plan_limit: lim('mock_interview'), extra: extra('mock_interview') },
    { feature: 'cv_generation', used: db.resumes.filter((r) => r.user_id === u.id && r.source === 'generated').length + (u.id === kabir.id ? 2 : 0), plan_limit: lim('cv_generation'), extra: extra('cv_generation') },
  ];
}

export const time = { NOW, MIN, HR, DAY, iso };
