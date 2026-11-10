import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Ban, ChevronLeft, Gauge, RotateCcw, UserCheck } from 'lucide-react';
import { api } from '@/api/client';
import type { Feature, UserDetail } from '@/api/types';
import { ago, date, dateTime, FEATURE_LABEL, money, PLAN_LABEL } from '@/lib/format';
import { useRetry } from '@/lib/useRetry';
import { INTERVIEW_LABEL } from '@/lib/labels';
import { Avatar, Banner, Bar, Button, Card, Chip, Dialog, DialogIcon, Empty, ErrorState, Field, inputCls, PageHeader, ScoreChip, Select, Skeleton, Table, Td, Tr } from '@/components/ui';
import { useToast } from '@/components/ui';

const RESUME_TONE = { parsed: 'green', saved: 'green', failed: 'red', processing: 'blue', pending: 'blue', draft: 'grey' } as const;

export default function UserProfile() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['user', id], queryFn: () => api.user(id) });
  const [dialog, setDialog] = useState<null | 'suspend' | 'reactivate' | 'limits'>(null);

  if (q.isLoading) return <><Skeleton className="h-16 w-80" /><Skeleton className="h-48" /><Skeleton className="h-64" /></>;
  if (q.isError) return <Card><ErrorState what="this user" onRetry={() => q.refetch()} /></Card>;
  const d = q.data!;
  const u = d.user;

  return (
    <>
      <Link to="/users" className="-mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-3 hover:text-ink"><ChevronLeft className="h-4 w-4" />Users</Link>
      <PageHeader
        title={<span className="flex items-center gap-3"><Avatar name={u.full_name} size={44} />{u.full_name ?? 'No name yet'}<Chip tone={u.plan === 'pro' ? 'blue' : 'grey'}>{PLAN_LABEL[u.plan]}</Chip>{u.status === 'suspended' && <Chip tone="amber">Suspended</Chip>}</span>}
        sub={`Joined ${date(u.created_at)} · Last active ${ago(u.last_login_at)}`}
        actions={u.status === 'active'
          ? <Button variant="danger" onClick={() => setDialog('suspend')}><Ban className="h-4 w-4" />Suspend</Button>
          : <Button variant="primary" onClick={() => setDialog('reactivate')}><UserCheck className="h-4 w-4" />Reactivate</Button>} />

      {u.suspension && <Banner tone="amber" icon={<Ban className="h-4 w-4" />} title={`Suspended ${date(u.suspension.at)} by ${u.suspension.by}`}>Reason: {u.suspension.reason}. They can't sign in to the app until you reactivate them.</Banner>}
      {!u.has_completed_onboarding && <Banner tone="blue" title="Onboarding not finished">They signed up but haven't set a target role or uploaded a resume yet.</Banner>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Details">
          <dl className="grid grid-cols-[140px_1fr] gap-y-2.5 text-[13.5px]">
            <dt className="text-ink-3">Phone</dt><dd>{u.phone ?? '—'} {u.phone && <Chip tone={u.phone_verified ? 'green' : 'grey'}>{u.phone_verified ? 'Verified' : 'Not verified'}</Chip>}</dd>
            <dt className="text-ink-3">Email</dt><dd className="break-all">{u.email ?? '—'} {u.email && <Chip tone={u.email_verified ? 'green' : 'grey'}>{u.email_verified ? 'Verified' : 'Not verified'}</Chip>}</dd>
            <dt className="text-ink-3">Signs in with</dt><dd>{u.auth_providers.map((p) => p[0].toUpperCase() + p.slice(1)).join(', ') || '—'}</dd>
            <dt className="text-ink-3">Location</dt><dd>{u.profile?.location ?? u.location ?? '—'}</dd>
            <dt className="text-ink-3">Current job</dt><dd>{u.profile?.current_job_title ?? '—'}</dd>
            <dt className="text-ink-3">Experience</dt><dd>{u.profile?.months_of_experience != null ? `${Math.floor(u.profile.months_of_experience / 12)} yrs ${u.profile.months_of_experience % 12} mo` : '—'}</dd>
            <dt className="text-ink-3">Target roles</dt><dd>{u.profile?.target_role.join(', ') || u.target_role || '—'}</dd>
          </dl>
        </Card>
        <PlanCard d={d} onLimits={() => setDialog('limits')} />
      </div>

      <ResumesCard d={d} />
      <InterviewsCard d={d} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CareerPlanCard d={d} />
        <Card flush title="Sign-in codes" sub="Last 10 one-time codes. The codes themselves are never shown.">
          {d.otp_requests.length === 0 ? <Empty title="No codes sent" /> : d.otp_requests.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5 text-[13px] last:border-0">
              <span className="capitalize">{o.purpose.replace('_', ' ')}</span><span className="text-ink-3">{dateTime(o.created_at)}</span>
              {o.consumed_at ? <Chip tone="green">Used</Chip> : Date.parse(o.expires_at) < Date.now() ? <Chip tone={o.attempts >= 3 ? 'red' : 'grey'}>{o.attempts >= 3 ? `${o.attempts} wrong tries` : 'Expired'}</Chip> : <Chip tone="blue">Waiting</Chip>}
            </div>
          ))}
        </Card>
      </div>

      <SuspendDialog d={d} open={dialog === 'suspend'} onClose={() => setDialog(null)} />
      <ReactivateDialog d={d} open={dialog === 'reactivate'} onClose={() => setDialog(null)} />
      <ExtraUsesDialog d={d} open={dialog === 'limits'} onClose={() => setDialog(null)} />
    </>
  );
}

function PlanCard({ d, onLimits }: { d: UserDetail; onLimits: () => void }) {
  const s = d.subscription;
  return (
    <Card title="Plan and payments" actions={<Button size="sm" onClick={onLimits}><Gauge className="h-4 w-4" />Change limits</Button>}>
      <div className="flex flex-col gap-4">
        <div className="text-[13.5px]"><span className="font-semibold">{PLAN_LABEL[d.user.plan]} plan</span>
          <span className="text-ink-3">{s ? ` · since ${date(s.started_at)}${s.ends_at ? ` · renews ${date(s.ends_at)}` : ''}` : ''}</span>
          {s && s.status !== 'active' && <Chip tone="amber" className="ml-2">{s.status === 'expired' ? 'Expired' : 'Cancelled'}</Chip>}</div>
        {d.usage.map((x) => {
          const cap = x.plan_limit == null ? null : x.plan_limit + x.extra;
          const full = cap != null && x.used >= cap;
          return (
            <div key={x.feature}>
              <div className="mb-1.5 flex justify-between text-[13px]"><span>{FEATURE_LABEL[x.feature]}</span>
                <span className={full ? 'font-semibold text-bad' : 'text-ink-2'}>{cap == null ? `${x.used} used · no limit` : `${x.used} of ${cap} used`}{x.extra > 0 && <span className="text-brand"> (+{x.extra} extra)</span>}</span></div>
              <Bar value={cap == null ? 0 : Math.min(1, x.used / Math.max(1, cap))} tone={full ? 'bad' : 'brand'} />
            </div>
          );
        })}
        <div className="border-t border-line pt-3">
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">Payments</div>
          {d.payments.length === 0 ? <div className="text-[13px] text-ink-3">No payments yet.</div> : d.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1.5 text-[13px]">
              <span>{date(p.created_at)} · {money(p.amount_paise)}</span>
              <span className="flex items-center gap-2">{p.failure_reason && <span className="text-[12px] text-ink-3">{p.failure_reason}</span>}<Chip tone={p.status === 'paid' ? 'green' : p.status === 'failed' ? 'red' : p.status === 'pending' ? 'amber' : 'grey'}>{p.status[0].toUpperCase() + p.status.slice(1)}</Chip></span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ResumesCard({ d }: { d: UserDetail }) {
  const nav = useNavigate();
  const { retry } = useRetry();
  return (
    <Card flush title="Resumes" sub={`${d.resumes.length} uploaded or generated`}>
      <Table head={[{ label: 'File' }, { label: 'Status' }, { label: 'ATS score' }, { label: 'Uploaded' }, { label: '' }]} empty={<Empty title="No resumes yet" />}>
        {d.resumes.map((r) => (
          <Tr key={r.id} onClick={() => nav(`/resumes?open=${r.id}`)}>
            <Td><div className="font-medium">{r.title ?? r.original_file_name ?? 'Untitled'}</div><div className="text-xs text-ink-3">{r.source === 'generated' ? 'Made in the app' : r.original_file_name}</div></Td>
            <Td><Chip tone={RESUME_TONE[r.status]}>{r.status === 'parsed' ? 'Read' : r.status[0].toUpperCase() + r.status.slice(1)}</Chip>{r.status === 'failed' && <div className="mt-1 max-w-[280px] text-xs text-ink-3">{r.error_message} · Try {r.attempts} of 3</div>}</Td>
            <Td><ScoreChip v={r.insights?.ats_score.overall} /></Td>
            <Td className="whitespace-nowrap text-ink-2">{ago(r.created_at)}</Td>
            <Td className="text-right">{r.status === 'failed' && r.attempts < 3 && <span onClick={(e) => e.stopPropagation()}><Button size="sm" onClick={() => retry('resume', r.id, d.user.full_name)}><RotateCcw className="h-3.5 w-3.5" />Retry</Button></span>}</Td>
          </Tr>
        ))}
      </Table>
    </Card>
  );
}

function InterviewsCard({ d }: { d: UserDetail }) {
  const nav = useNavigate();
  return (
    <Card flush title="Mock interviews" sub={`${d.interviews.length} total`}>
      <Table head={[{ label: 'Role' }, { label: 'Status' }, { label: 'Questions' }, { label: 'Score' }, { label: 'Started' }]} empty={<Empty title="No interviews yet" />}>
        {d.interviews.map((i) => (
          <Tr key={i.id} onClick={() => nav(`/interviews/${i.id}`)}>
            <Td><div className="font-medium">{i.target_role ?? '—'}</div><div className="text-xs capitalize text-ink-3">{i.level ?? ''}</div></Td>
            <Td><Chip tone={INTERVIEW_LABEL[i.status][1]}>{INTERVIEW_LABEL[i.status][0]}</Chip></Td>
            <Td>{i.questions_asked} of {i.question_budget}</Td>
            <Td><ScoreChip v={i.overall_score} /></Td>
            <Td className="whitespace-nowrap text-ink-2">{ago(i.created_at)}</Td>
          </Tr>
        ))}
      </Table>
    </Card>
  );
}

function CareerPlanCard({ d }: { d: UserDetail }) {
  const p = d.career_plan;
  const { retry } = useRetry();
  return (
    <Card title="Career plan">
      {!p ? <Empty title="No career plan" sub="They haven't made one yet." /> : (
        <div className="flex flex-col gap-3 text-[13.5px]">
          <div className="flex items-center justify-between"><span className="font-semibold">{p.target_role}</span>
            <Chip tone={p.status === 'ready' ? 'green' : p.status === 'failed' ? 'red' : p.status === 'generating' ? 'blue' : 'grey'}>{p.status === 'ready' ? 'Ready' : p.status === 'failed' ? 'Failed' : p.status === 'generating' ? 'Generating…' : 'Replaced'}</Chip></div>
          <div className="text-ink-3 capitalize">{p.level} · {p.months} months · {p.hours_per_week} hrs a week · made {date(p.created_at)}</div>
          {p.status === 'ready' && <><div className="flex justify-between text-[13px]"><span>{p.completed_tasks} of {p.total_tasks} tasks done</span><span className="text-ink-3">{p.streak_days}-day streak</span></div><Bar value={p.completed_tasks / Math.max(1, p.total_tasks)} tone="good" /></>}
          {p.status === 'failed' && <Banner tone="red" icon={<AlertTriangle className="h-4 w-4" />}>{p.error} · Try {p.attempts} of 3</Banner>}
          {p.status === 'failed' && (p.attempts < 3 ? <Button size="sm" className="self-start" onClick={() => retry('career_plan', p.id, d.user.full_name)}><RotateCcw className="h-3.5 w-3.5" />Retry</Button> : <span className="text-[13px] text-bad">All 3 tries used. This needs a developer.</span>)}
        </div>
      )}
    </Card>
  );
}

function useUserMutation<T>(fn: (v: T) => Promise<unknown>, ok: string, onDone: () => void) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['user'] }); qc.invalidateQueries({ queryKey: ['users'] }); qc.invalidateQueries({ queryKey: ['limits'] }); toast({ tone: 'success', title: ok }); onDone(); },
    onError: () => toast({ tone: 'error', title: 'That didn’t save', body: 'The server did not answer. Try again.' }),
  });
}

function SuspendDialog({ d, open, onClose }: { d: UserDetail; open: boolean; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const m = useUserMutation(() => api.suspend(d.user.id, reason.trim()), `${d.user.full_name ?? 'User'} is suspended`, () => { setReason(''); onClose(); });
  return (
    <Dialog open={open} onClose={onClose} icon={<DialogIcon tone="red"><Ban className="h-5 w-5" /></DialogIcon>} title={`Suspend ${d.user.full_name ?? 'this user'}?`}
      sub="They're signed out right away and can't sign in until you reactivate them. Their data stays."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" disabled={reason.trim().length < 3} loading={m.isPending} onClick={() => m.mutate(undefined)}>Suspend</Button></>}>
      <Field label="Reason" hint="Saved in the admin log. The user doesn't see it."><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={inputCls + ' h-auto py-2'} placeholder="e.g. Spam uploads" /></Field>
    </Dialog>
  );
}

function ReactivateDialog({ d, open, onClose }: { d: UserDetail; open: boolean; onClose: () => void }) {
  const m = useUserMutation(() => api.reactivate(d.user.id), `${d.user.full_name ?? 'User'} is active again`, onClose);
  return (
    <Dialog open={open} onClose={onClose} icon={<DialogIcon tone="green"><UserCheck className="h-5 w-5" /></DialogIcon>} title={`Reactivate ${d.user.full_name ?? 'this user'}?`} sub="They can sign in again straight away."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={m.isPending} onClick={() => m.mutate(undefined)}>Reactivate</Button></>} />
  );
}

function ExtraUsesDialog({ d, open, onClose }: { d: UserDetail; open: boolean; onClose: () => void }) {
  const [feature, setFeature] = useState<Feature>('mock_interview');
  const [extra, setExtra] = useState(1);
  const [ends, setEnds] = useState('');
  const [reason, setReason] = useState('');
  const usage = d.usage.find((x) => x.feature === feature);
  const m = useUserMutation(() => api.extraUses(d.user.id, { feature, extra, ends_at: ends ? new Date(ends).toISOString() : null, reason: reason.trim() }), 'Limit updated', () => { setReason(''); onClose(); });
  return (
    <Dialog open={open} onClose={onClose} icon={<DialogIcon tone="blue"><Gauge className="h-5 w-5" /></DialogIcon>} title="Give extra uses" sub={`Adds to ${d.user.full_name ?? 'this user'}'s plan limit. Only this user is affected.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={reason.trim().length < 3} loading={m.isPending} onClick={() => m.mutate(undefined)}>Save</Button></>}>
      <Field label="Feature"><Select label="Feature" className="w-full" value={feature} onChange={(v) => setFeature(v as Feature)} options={[['mock_interview', FEATURE_LABEL.mock_interview], ['cv_generation', FEATURE_LABEL.cv_generation]]} /></Field>
      {usage && <div className="text-[13px] text-ink-3">Now: {usage.used} used of {usage.plan_limit == null ? 'no limit' : usage.plan_limit + usage.extra}{usage.extra ? ` (includes ${usage.extra} extra)` : ''}</div>}
      <Field label="Extra uses">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setExtra((x) => Math.max(0, x - 1))} aria-label="Fewer">−</Button>
          <span className="w-10 text-center text-[15px] font-semibold">{extra}</span>
          <Button size="sm" onClick={() => setExtra((x) => Math.min(50, x + 1))} aria-label="More">+</Button>
          {extra === 0 && <span className="text-[12.5px] text-ink-3">0 removes their extra uses</span>}
        </div>
      </Field>
      <Field label="Ends on" hint="Leave empty to keep them until you remove them."><input type="date" value={ends} onChange={(e) => setEnds(e.target.value)} className={inputCls} /></Field>
      <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="e.g. Report failed twice, goodwill" /></Field>
    </Dialog>
  );
}
