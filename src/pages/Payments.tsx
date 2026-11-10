import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CreditCard, Info } from 'lucide-react';
import { api } from '@/api/client';
import type { PaymentStatus } from '@/api/types';
import { dateTime, money, n } from '@/lib/format';
import { Banner, Card, Chip, Empty, ErrorState, PageHeader, Pager, Skeleton, Stat, Table, TableSkeleton, Tabs, Td, Tr, UserCell } from '@/components/ui';

type Tab = 'all' | PaymentStatus;
const TONE = { paid: 'green', failed: 'red', pending: 'amber', refunded: 'grey' } as const;
const METHOD = { upi: 'UPI', card: 'Card', netbanking: 'Net banking' } as const;

export default function Payments() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const status = (sp.get('status') ?? 'all') as Tab, page = Number(sp.get('page') ?? 1);
  const set = (k: string, v: string) => { const x = new URLSearchParams(sp); if (v && v !== 'all') x.set(k, v); else x.delete(k); if (k !== 'page') x.delete('page'); setSp(x, { replace: true }); };
  const r = useQuery({ queryKey: ['payments', { status, page }], queryFn: () => api.payments({ status, page }), placeholderData: keepPreviousData });
  const s = r.data?.summary, c = r.data?.counts ?? {};

  return (
    <>
      <PageHeader title="Payments" sub="Pro upgrades and renewals. Read-only: refunds happen in the payment provider's dashboard." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!s ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-[14px]" />) : <>
          <Stat label="Pro users" value={n(s.pro_users)} />
          <Stat label="Free users" value={n(s.free_users)} />
          <Stat label="Paid, last 30 days" value={n(s.paid_this_month)} tone="good" />
          <Stat label="Failed, last 7 days" value={n(s.failed_7d)} tone={s.failed_7d ? 'bad' : 'muted'} />
        </>}
      </div>
      <Banner tone="grey" icon={<Info className="h-4 w-4" />}>Amounts show as ₹[price] until pricing is final. The backend fills them in from the payments table.</Banner>
      <Card flush>
        <div className="border-b border-line px-5 pt-2">
          <Tabs value={status} onChange={(v) => set('status', v)} options={[{ value: 'all', label: 'All', count: c.all }, { value: 'paid', label: 'Paid', count: c.paid }, { value: 'failed', label: 'Failed', count: c.failed }, { value: 'pending', label: 'Pending', count: c.pending }, { value: 'refunded', label: 'Refunded', count: c.refunded }]} />
        </div>
        {r.isLoading ? <TableSkeleton rows={8} /> : r.isError ? <ErrorState what="payments" onRetry={() => r.refetch()} /> : (
          <>
            <Table head={[{ label: 'User' }, { label: 'Plan' }, { label: 'Amount' }, { label: 'Method' }, { label: 'Status' }, { label: 'Reference' }, { label: 'When' }]} empty={<Empty icon={<CreditCard className="h-5 w-5" />} title="No payments here" />}>
              {r.data!.items.map((p) => (
                <Tr key={p.id} onClick={() => nav(`/users/${p.user.id}`)}>
                  <Td><UserCell name={p.user.full_name} sub={p.user.location} /></Td>
                  <Td><Chip tone="blue">{p.plan === 'pro' ? 'Pro' : 'Free'}</Chip></Td>
                  <Td>{money(p.amount_paise)}</Td>
                  <Td>{p.method ? METHOD[p.method] : '—'}</Td>
                  <Td><Chip tone={TONE[p.status]}>{p.status[0].toUpperCase() + p.status.slice(1)}</Chip>{p.failure_reason && <div className="mt-1 max-w-[220px] text-xs text-ink-3">{p.failure_reason}</div>}</Td>
                  <Td className="font-mono text-[12px] text-ink-3">{p.provider_reference}</Td>
                  <Td className="whitespace-nowrap text-ink-2">{dateTime(p.created_at)}</Td>
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
