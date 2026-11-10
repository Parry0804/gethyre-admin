import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, FileText, RotateCcw } from 'lucide-react';
import { api } from '@/api/client';
import { ago, dateTime } from '@/lib/format';
import { useRetry } from '@/lib/useRetry';
import { Banner, Bar, Button, Card, Chip, Drawer, Empty, ErrorState, PageHeader, Pager, ScoreChip, Skeleton, Table, TableSkeleton, Tabs, Td, Tr, UserCell } from '@/components/ui';

type Tab = 'all' | 'parsed' | 'failed' | 'processing' | 'generated';
const STATUS: Record<string, [string, 'green' | 'red' | 'blue' | 'grey']> = { parsed: ['Read', 'green'], saved: ['Saved', 'green'], failed: ['Failed', 'red'], processing: ['Reading…', 'blue'], pending: ['Waiting', 'blue'], draft: ['Draft', 'grey'] };

export default function Resumes() {
  const [sp, setSp] = useSearchParams();
  const status = (sp.get('status') ?? 'all') as Tab, page = Number(sp.get('page') ?? 1), open = sp.get('open');
  const set = (k: string, v: string | null) => { const n = new URLSearchParams(sp); if (v && v !== 'all') n.set(k, v); else n.delete(k); if (k === 'status') n.delete('page'); setSp(n, { replace: true }); };
  const r = useQuery({ queryKey: ['resumes', { status, page }], queryFn: () => api.resumes({ status, page }), placeholderData: keepPreviousData });
  const c = r.data?.counts ?? {};
  const { retry } = useRetry();

  return (
    <>
      <PageHeader title="Resumes" sub="Every resume users uploaded or made in the app." />
      <Card flush>
        <div className="border-b border-line px-5 pt-2">
          <Tabs value={status} onChange={(v) => set('status', v)} options={[{ value: 'all', label: 'All', count: c.all }, { value: 'parsed', label: 'Read', count: c.parsed }, { value: 'failed', label: 'Failed', count: c.failed }, { value: 'processing', label: 'Reading', count: c.processing }, { value: 'generated', label: 'Made in app', count: c.generated }]} />
        </div>
        {r.isLoading ? <TableSkeleton rows={8} /> : r.isError ? <ErrorState what="resumes" onRetry={() => r.refetch()} /> : (
          <>
            <Table head={[{ label: 'User' }, { label: 'File' }, { label: 'Status' }, { label: 'ATS score' }, { label: 'Uploaded' }, { label: '' }]} empty={<Empty icon={<FileText className="h-5 w-5" />} title="No resumes here" sub={status === 'failed' ? 'No resume failed to read. Nice.' : undefined} />}>
              {r.data!.items.map((x) => (
                <Tr key={x.id} onClick={() => set('open', x.id)}>
                  <Td><UserCell name={x.user.full_name} sub={x.user.target_role} /></Td>
                  <Td className="max-w-[240px]"><div className="truncate">{x.original_file_name ?? x.title ?? 'Untitled'}</div><div className="text-xs text-ink-3">{x.source === 'generated' ? 'Made in the app' : (x.verified_file_type ?? x.claimed_file_type ?? '').toUpperCase()}</div></Td>
                  <Td><Chip tone={STATUS[x.status][1]}>{STATUS[x.status][0]}</Chip>{x.status === 'failed' && <div className="mt-1 text-xs text-ink-3">Try {x.attempts} of 3</div>}</Td>
                  <Td><ScoreChip v={x.insights?.ats_score.overall} /></Td>
                  <Td className="whitespace-nowrap text-ink-2">{ago(x.created_at)}</Td>
                  <Td className="text-right">{x.status === 'failed' && x.attempts < 3 && <span onClick={(e) => e.stopPropagation()}><Button size="sm" onClick={() => retry('resume', x.id, x.user.full_name)}>Retry</Button></span>}</Td>
                </Tr>
              ))}
            </Table>
            <Pager page={page} total={r.data!.total} pageSize={r.data!.page_size} onPage={(p) => set('page', String(p))} />
          </>
        )}
      </Card>
      {open && <ResumeDrawer id={open} onClose={() => set('open', null)} />}
    </>
  );
}

function ResumeDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const nav = useNavigate();
  const q = useQuery({ queryKey: ['resume', id], queryFn: () => api.resume(id), refetchInterval: (s) => (s.state.data?.status === 'processing' ? 2000 : false) });
  const { retry } = useRetry();
  const r = q.data;
  const ats = r?.insights?.ats_score;
  return (
    <Drawer onClose={onClose} title={r ? r.title ?? r.original_file_name ?? 'Resume' : 'Resume'} sub={r ? `${r.user.full_name ?? 'User'} · uploaded ${dateTime(r.created_at)}` : undefined}
      footer={r && <>
        <Button onClick={() => nav(`/users/${r.user.id}`)}>Open user</Button>
        {r.status === 'failed' && r.attempts < 3 && <Button variant="primary" onClick={() => retry('resume', r.id, r.user.full_name)}><RotateCcw className="h-4 w-4" />Retry reading</Button>}
      </>}>
      {q.isLoading ? <Skeleton className="h-60" /> : q.isError ? <ErrorState what="this resume" onRetry={() => q.refetch()} /> : r && (
        <div className="flex flex-col gap-5 text-[13.5px]">
          <div className="flex flex-wrap gap-2"><Chip tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Chip><Chip>{r.source === 'generated' ? 'Made in the app' : 'Uploaded'}</Chip>{r.verified_file_type && <Chip>{r.verified_file_type.toUpperCase()}</Chip>}</div>
          {r.status === 'failed' && <Banner tone="red" icon={<AlertTriangle className="h-4 w-4" />} title={`Couldn't read this resume · try ${r.attempts} of 3`}>{r.error_message}{r.attempts >= 3 && ' All tries are used up, so this needs a developer.'}</Banner>}
          {r.status === 'processing' && <Banner tone="blue">Reading now. This usually takes under a minute.</Banner>}
          {r.claimed_file_type && r.verified_file_type && r.claimed_file_type !== r.verified_file_type && <Banner tone="amber">The file says it's {r.claimed_file_type.toUpperCase()} but it's really {r.verified_file_type.toUpperCase()}.</Banner>}
          {r.insights && ats && <>
            <div><div className="mb-1 font-semibold">Summary</div><p className="text-ink-2">{r.insights.resume_summary}</p></div>
            <div>
              <div className="mb-2 flex items-center justify-between font-semibold">ATS score <ScoreChip v={ats.overall} /></div>
              {([['Formatting', ats.formatting], ['Completeness', ats.completeness], ['Contact info', ats.contact_info], ['Work history', ats.work_history], ['Impact', ats.impact_quality]] as const).map(([l, v]) => (
                <div key={l} className="mb-2"><div className="mb-1 flex justify-between text-[12.5px] text-ink-2"><span>{l}</span><span>{v}</span></div><Bar value={v / 100} tone={v >= 70 ? 'good' : v >= 45 ? 'warn' : 'bad'} /></div>
              ))}
            </div>
            <List title="Strengths" items={r.insights.strengths} />
            <List title="Gaps" items={r.insights.gaps} />
            <List title="Missing sections" items={ats.missing_sections} />
            {r.insights.skills.length > 0 && <div><div className="mb-1.5 font-semibold">Skills</div><div className="flex flex-wrap gap-1.5">{r.insights.skills.map((s) => <Chip key={s}>{s}</Chip>)}</div></div>}
          </>}
          {r.s3_key && <div className="text-[12.5px] text-ink-3">Original file: <code className="font-mono">{r.original_file_name}</code>. The backend gives a short-lived download link for it.</div>}
        </div>
      )}
    </Drawer>
  );
}

const List = ({ title, items }: { title: string; items: string[] }) => (items.length === 0 ? null : (
  <div><div className="mb-1 font-semibold">{title}</div><ul className="list-disc space-y-1 pl-5 text-ink-2">{items.map((x) => <li key={x}>{x}</li>)}</ul></div>
));
