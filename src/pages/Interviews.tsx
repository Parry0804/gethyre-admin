import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { api } from '@/api/client';
import { ago } from '@/lib/format';
import { INTERVIEW_LABEL } from '@/lib/labels';
import { Card, Chip, Empty, ErrorState, PageHeader, Pager, ScoreChip, Select, Table, TableSkeleton, Tabs, Td, Tr, UserCell } from '@/components/ui';

type Tab = 'all' | 'complete' | 'in_progress' | 'fail' | 'abandoned';
const ROLES = ['Backend Engineer', 'Frontend Engineer', 'Data Analyst', 'Product Designer', 'Product Manager', 'Data Scientist', 'DevOps Engineer', 'Android Developer', 'Business Analyst', 'QA Engineer'];

export default function Interviews() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const status = (sp.get('status') ?? 'all') as Tab, role = sp.get('role') ?? 'all', page = Number(sp.get('page') ?? 1);
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v && v !== 'all') n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setSp(n, { replace: true }); };
  const r = useQuery({ queryKey: ['interviews', { status, role, page }], queryFn: () => api.interviews({ status, role, page }), placeholderData: keepPreviousData });
  const c = r.data?.counts ?? {};

  return (
    <>
      <PageHeader title="Mock interviews" sub="Every practice interview, with its report." />
      <Card flush>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 pt-2">
          <Tabs value={status} onChange={(v) => set('status', v)} options={[{ value: 'all', label: 'All', count: c.all }, { value: 'complete', label: 'Finished', count: c.complete }, { value: 'in_progress', label: 'In progress', count: c.in_progress }, { value: 'fail', label: 'Report failed', count: c.fail }, { value: 'abandoned', label: 'Left early', count: c.abandoned }]} />
          <Select className="mb-2" label="Role" value={role} onChange={(v) => set('role', v)} options={[['all', 'All roles'], ...ROLES.map((x) => [x, x] as [string, string])]} />
        </div>
        {r.isLoading ? <TableSkeleton rows={8} /> : r.isError ? <ErrorState what="interviews" onRetry={() => r.refetch()} /> : (
          <>
            <Table head={[{ label: 'User' }, { label: 'Role' }, { label: 'Status' }, { label: 'Questions' }, { label: 'Score' }, { label: 'Started' }]} empty={<Empty icon={<MessageSquare className="h-5 w-5" />} title="No interviews here" />}>
              {r.data!.items.map((i) => (
                <Tr key={i.id} onClick={() => nav(`/interviews/${i.id}`)}>
                  <Td><UserCell name={i.user.full_name} sub={i.user.location} /></Td>
                  <Td><div>{i.target_role ?? '—'}</div><div className="text-xs capitalize text-ink-3">{i.level}</div></Td>
                  <Td><Chip tone={INTERVIEW_LABEL[i.status][1]}>{INTERVIEW_LABEL[i.status][0]}</Chip>{i.status === 'fail' && <div className="mt-1 text-xs text-ink-3">Try {i.attempts} of 3</div>}</Td>
                  <Td>{i.questions_asked} of {i.question_budget}</Td>
                  <Td><ScoreChip v={i.overall_score} /></Td>
                  <Td className="whitespace-nowrap text-ink-2">{ago(i.created_at)}</Td>
                </Tr>
              ))}
            </Table>
            <Pager page={page} total={r.data!.total} pageSize={r.data!.page_size} onPage={(p) => set('page', String(p))} />
          </>
        )}
      </Card>
    </>
  );
}
