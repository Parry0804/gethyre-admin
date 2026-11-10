import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, Search } from 'lucide-react';
import { api } from '@/api/client';
import type { ExportFilters } from '@/api/types';
import { ago, n } from '@/lib/format';
import { ExportUsersDialog } from '@/components/ExportDialog';
import { Button, Card, Chip, Empty, ErrorState, PageHeader, Pager, Select, Table, TableSkeleton, Td, Tr, UserCell } from '@/components/ui';

export default function Users() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const q = sp.get('q') ?? '', status = sp.get('status') ?? 'all', plan = sp.get('plan') ?? 'all', sort = sp.get('sort') ?? 'newest', page = Number(sp.get('page') ?? 1);
  const [text, setText] = useState(q);
  const [exporting, setExporting] = useState(false);
  const set = (k: string, v: string) => { const next = new URLSearchParams(sp); if (v && v !== 'all' && !(k === 'sort' && v === 'newest')) next.set(k, v); else next.delete(k); if (k !== 'page') next.delete('page'); setSp(next, { replace: true }); };
  useEffect(() => setText(q), [q]);
  useEffect(() => { const t = setTimeout(() => text !== q && set('q', text.trim()), 300); return () => clearTimeout(t); }); // debounce typing

  const r = useQuery({ queryKey: ['users', { q, status, plan, sort, page }], queryFn: () => api.users({ q, status, plan, sort, page }), placeholderData: keepPreviousData });
  const filters: ExportFilters = { plan: plan as ExportFilters['plan'], status: status as ExportFilters['status'], signed_up_from: null };

  return (
    <>
      <PageHeader title="Users" sub={r.data ? `${n(r.data.total)} ${q || status !== 'all' || plan !== 'all' ? 'match these filters' : 'people have a GetHyre account'}.` : ' '}
        actions={<Button onClick={() => setExporting(true)} disabled={!r.data?.total}><Download className="h-4 w-4" />Export</Button>} />
      <Card flush>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-5 py-3.5">
          <div className="relative w-full max-w-[300px]"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-4" /><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by name, phone or email" aria-label="Search users" className="h-[38px] w-full rounded-[10px] border border-edge pl-9 pr-3 text-[13.5px] outline-none focus:border-brand" /></div>
          <Select label="Status" value={status} onChange={(v) => set('status', v)} options={[['all', 'All statuses'], ['active', 'Active'], ['suspended', 'Suspended']]} />
          <Select label="Plan" value={plan} onChange={(v) => set('plan', v)} options={[['all', 'All plans'], ['free', 'Free'], ['pro', 'Pro']]} />
          <Select className="ml-auto" label="Sort" value={sort} onChange={(v) => set('sort', v)} options={[['newest', 'Newest first'], ['last_active', 'Last active'], ['name', 'Name A–Z']]} />
        </div>
        {r.isLoading ? <TableSkeleton rows={8} /> : r.isError ? <ErrorState what="users" onRetry={() => r.refetch()} /> : (
          <>
            <Table head={[{ label: 'User' }, { label: 'Phone' }, { label: 'Email' }, { label: 'Plan' }, { label: 'Status' }, { label: 'Last active' }]}
              empty={<Empty icon={<Search className="h-5 w-5" />} title={q ? `No user matches "${q}"` : 'No users match these filters'} sub="Check the spelling, or search by phone number or email instead." action={<Button size="sm" onClick={() => setSp({})}>Clear search</Button>} />}>
              {r.data!.items.map((u) => (
                <Tr key={u.id} onClick={() => nav(`/users/${u.id}`)}>
                  <Td><UserCell name={u.full_name} sub={[u.location, u.target_role].filter(Boolean).join(' · ') || 'Onboarding not finished'} /></Td>
                  <Td className="whitespace-nowrap">{u.phone ?? '—'}</Td>
                  <Td className="max-w-[220px] truncate">{u.email ?? '—'}</Td>
                  <Td><Chip tone={u.plan === 'pro' ? 'blue' : 'grey'}>{u.plan === 'pro' ? 'Pro' : 'Free'}</Chip></Td>
                  <Td><Chip tone={u.status === 'active' ? 'green' : 'amber'}>{u.status === 'active' ? 'Active' : 'Suspended'}</Chip></Td>
                  <Td className="whitespace-nowrap text-ink-2">{ago(u.last_login_at)}</Td>
                </Tr>
              ))}
            </Table>
            <Pager page={page} total={r.data!.total} pageSize={r.data!.page_size} onPage={(p) => set('page', String(p))} />
          </>
        )}
      </Card>
      <ExportUsersDialog open={exporting} onClose={() => setExporting(false)} count={r.data?.total ?? 0} filters={filters} />
    </>
  );
}
