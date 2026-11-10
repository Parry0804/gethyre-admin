import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ago, date, dateTime, n, pct } from '@/lib/format';
import { useRetry } from '@/lib/useRetry';
import { JobsTable } from '@/components/JobsTable';
import { Banner, Button, Card, Chip, Dialog, DialogIcon, ErrorState, PageHeader, Skeleton, Stat, TableSkeleton, UserCell } from '@/components/ui';

export default function Overview() {
  const nav = useNavigate();
  const { retry, retryAll, retryingAll, overview: q } = useRetry();
  const [confirmAll, setConfirmAll] = useState(false);
  const d = q.data;
  const jobs = d?.failed_jobs ?? [];
  const retryable = jobs.filter((j) => j.state === 'failed' || j.state === 'stuck');
  const limited = jobs.filter((j) => j.state === 'limit');
  const s = d?.stats;
  const change = s ? pct(s.signups_this_week - s.signups_last_week, Math.max(1, s.signups_last_week)) : 0;
  const maxDay = Math.max(1, ...(d?.signups_14d ?? []).map((x) => x.count));

  return (
    <>
      <PageHeader title="Overview" sub={date(new Date().toISOString())} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!s ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-[14px]" />) : <>
          <Link to="/users"><Stat label="Total users" value={n(s.total_users)} note={`+${n(s.new_this_month)} this month`} tone="good" /></Link>
          <Link to="/users"><Stat label="Signed up this week" value={n(s.signups_this_week)} note={`${change >= 0 ? '+' : ''}${change}% vs last week`} tone={change >= 0 ? 'good' : 'bad'} /></Link>
          <Link to="/interviews?status=complete"><Stat label="Interviews finished, 7 days" value={n(s.interviews_finished_7d)} note={s.avg_score_7d != null ? `Average score ${s.avg_score_7d}` : 'No scores yet'} /></Link>
          <Link to="/resumes?status=failed"><Stat label="Resumes read successfully" value={`${Math.round(s.resume_read_rate * 100)}%`} note={`${s.resumes_failed_7d} failed`} tone={s.resumes_failed_7d ? 'bad' : 'muted'} /></Link>
        </>}
      </div>

      <Card flush title="Failed and stuck jobs" sub={jobs.length ? 'Users are waiting on each one. A job can be retried up to 3 times.' : 'Nothing needs a retry right now.'}
        actions={retryable.length > 0 && <Button size="sm" onClick={() => setConfirmAll(true)} loading={retryingAll}>Retry all ({retryable.length})</Button>}>
        {q.isLoading ? <TableSkeleton rows={4} /> : q.isError ? <ErrorState what="failed jobs" onRetry={() => q.refetch()} /> : <JobsTable jobs={jobs} onRetry={(j) => retry(j.kind, j.id, j.user.full_name)} />}
      </Card>

      {d && d.payment_issues.length > 0 && (
        <Card flush title="Payments needing a look" sub="Failed or stuck payments in the last 7 days" actions={<Button size="sm" variant="ghost" onClick={() => nav('/payments?status=failed')}>See all payments</Button>}>
          {d.payment_issues.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-3 last:border-0">
              <div className="w-56"><UserCell name={p.user.full_name} sub="Pro upgrade" /></div>
              <div className="min-w-[200px] flex-1 text-[13px] text-ink-2">{p.failure_reason}</div>
              <div className="text-[12.5px] text-ink-3">{dateTime(p.created_at)}</div>
              <Chip tone={p.status === 'failed' ? 'red' : 'amber'}>{p.status === 'failed' ? 'Failed' : 'Pending'}</Chip>
              <Button size="sm" onClick={() => nav(`/users/${p.user.id}`)}>Open user</Button>
            </div>
          ))}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Sign-ups, last 14 days">
          {!d ? <Skeleton className="h-44" /> : (
            <div>
              <div className="flex h-40 items-end gap-1.5">
                {d.signups_14d.map((x, i) => (
                  <div key={x.date} className="group relative flex h-full flex-1 items-end" title={`${date(x.date)}: ${x.count}`}>
                    <div className={i === d.signups_14d.length - 1 ? 'w-full rounded-t bg-brand' : 'w-full rounded-t bg-brand/45'} style={{ height: `${Math.max(2, (x.count / maxDay) * 100)}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-ink-4"><span>{date(d.signups_14d[0].date)}</span><span>Today</span></div>
            </div>
          )}
        </Card>
        <Card flush title="Newest users" actions={<Button size="sm" variant="ghost" onClick={() => nav('/users')}>See all</Button>}>
          {(d?.newest_users ?? []).map((u) => (
            <Link key={u.id} to={`/users/${u.id}`} className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-0 hover:bg-canvas">
              <UserCell name={u.full_name} sub={[u.location, u.target_role].filter(Boolean).join(' · ')} /><span className="text-[12.5px] text-ink-3">{ago(u.created_at)}</span>
            </Link>
          ))}
        </Card>
      </div>

      <Dialog open={confirmAll} onClose={() => setConfirmAll(false)} icon={<DialogIcon tone="blue"><RefreshCw className="h-5 w-5" /></DialogIcon>}
        title={`Retry ${retryable.length} jobs?`} sub="Each job goes back into its queue. Users get a notification when theirs finishes."
        footer={<><Button onClick={() => setConfirmAll(false)}>Cancel</Button><Button variant="primary" onClick={() => { setConfirmAll(false); retryAll(); }}>Retry {retryable.length} jobs</Button></>}>
        {limited.length > 0 && <Banner tone="amber" icon={<AlertTriangle className="h-4 w-4" />}>{limited.map((j) => j.user.full_name?.split(' ')[0]).join(', ')} {limited.length === 1 ? 'has' : 'have'} used all 3 tries, so {limited.length === 1 ? "it won't" : "they won't"} be retried. That needs a developer.</Banner>}
      </Dialog>
    </>
  );
}
