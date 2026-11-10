import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileDown } from 'lucide-react';
import { api } from '@/api/client';
import type { ExportData, ExportFilters, ExportFormat } from '@/api/types';
import { dateTime, n } from '@/lib/format';
import { FORMATS } from '@/components/ExportDialog';
import { Banner, Bar, Button, Card, Chip, Empty, ErrorState, Field, inputCls, PageHeader, Select, Switch, Table, TableSkeleton, Td, Tr, cx, useToast } from '@/components/ui';

const DATA: Array<{ value: ExportData; label: string; desc: string }> = [
  { value: 'users', label: 'Users', desc: 'Profile, plan, status, sign-up date' },
  { value: 'resumes', label: 'Resumes', desc: 'Status, ATS scores, strengths and gaps' },
  { value: 'interviews', label: 'Mock interviews', desc: 'Role, score, report summary' },
  { value: 'career_plans', label: 'Career plans', desc: 'Target role, progress, streak' },
  { value: 'payments', label: 'Payments', desc: 'Plan, amount, status, reference' },
  { value: 'otp_requests', label: 'Sign-in codes', desc: 'When sent and whether used. Never the codes.' },
];

export default function Exports() {
  const qc = useQueryClient();
  const toast = useToast();
  const [data, setData] = useState<ExportData[]>(['users']);
  const [filters, setFilters] = useState<ExportFilters>({ plan: 'all', status: 'all', signed_up_from: null });
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [contacts, setContacts] = useState(false);

  const list = useQuery({ queryKey: ['exports'], queryFn: api.exports, refetchInterval: (q) => (q.state.data?.items.some((x) => x.status === 'preparing') ? 1000 : false) });
  const count = useQuery({ queryKey: ['users-count', filters], queryFn: () => api.countUsers(filters) });
  const m = useMutation({
    mutationFn: () => api.createExport({ data, filters, format, include_contacts: contacts }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exports'] }); toast({ tone: 'info', title: 'Export started', body: 'It shows below. Download it when it says Ready.' }); },
    onError: () => toast({ tone: 'error', title: "Couldn't start the export", body: 'The server did not answer. Try again.' }),
  });
  const toggle = (v: ExportData) => setData((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));
  const users = count.data?.count;
  const pdfTooBig = format === 'pdf' && (users ?? 0) > 500;

  return (
    <>
      <PageHeader title="Exports" sub="Download user data as Excel, CSV, PDF or JSON. Files are kept for 7 days." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card title="New export">
          <div className="flex flex-col gap-6">
            <Step n={1} title="What data">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {DATA.map((x) => (
                  <label key={x.value} className={cx('flex cursor-pointer gap-2.5 rounded-[10px] border p-3', data.includes(x.value) ? 'border-brand bg-brand-soft' : 'border-edge')}>
                    <input type="checkbox" className="mt-0.5" checked={data.includes(x.value)} onChange={() => toggle(x.value)} />
                    <span><span className="block text-[13.5px] font-semibold">{x.label}</span><span className="text-[12px] text-ink-3">{x.desc}</span></span>
                  </label>
                ))}
              </div>
            </Step>
            <Step n={2} title="Which users">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Plan"><Select label="Plan" className="w-full" value={filters.plan} onChange={(v) => setFilters({ ...filters, plan: v as ExportFilters['plan'] })} options={[['all', 'All plans'], ['free', 'Free'], ['pro', 'Pro']]} /></Field>
                <Field label="Status"><Select label="Status" className="w-full" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v as ExportFilters['status'] })} options={[['all', 'All'], ['active', 'Active'], ['suspended', 'Suspended']]} /></Field>
                <Field label="Signed up from"><input type="date" className={inputCls} value={filters.signed_up_from?.slice(0, 10) ?? ''} onChange={(e) => setFilters({ ...filters, signed_up_from: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
              </div>
              <div className="mt-2 text-[13px] text-ink-2">{users == null ? 'Counting…' : <><span className="font-semibold">{n(users)}</span> users match</>}</div>
            </Step>
            <Step n={3} title="Format">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {FORMATS.map((f) => (
                  <button key={f.value} onClick={() => setFormat(f.value)} aria-pressed={format === f.value} className={cx('rounded-[10px] border p-3 text-left', format === f.value ? 'border-brand bg-brand-soft' : 'border-edge')}>
                    <span className="text-[13.5px] font-semibold">{f.name}</span> <span className="text-[12px] text-ink-3">{f.ext}</span>
                    <span className="mt-0.5 block text-[12px] text-ink-3">{f.desc}</span>
                  </button>
                ))}
              </div>
              {pdfTooBig && <div className="mt-2"><Banner tone="amber">PDF is best for up to 500 users. For {n(users!)} users, Excel or CSV works better.</Banner></div>}
            </Step>
            <Step n={4} title="Contact details">
              <div className="flex items-center gap-3"><Switch on={contacts} onChange={setContacts} label="Include phone numbers and emails" /><span className="text-[13.5px]">Include phone numbers and emails</span></div>
              {contacts && <div className="mt-2 text-[12.5px] text-warn">This file will have personal data. Share it only with people who need it. The export is logged.</div>}
            </Step>
            <div className="flex items-center justify-between border-t border-line pt-4">
              <span className="text-[13px] text-ink-3">{data.length} {data.length === 1 ? 'kind' : 'kinds'} of data · {FORMATS.find((f) => f.value === format)!.name}</span>
              <Button variant="primary" disabled={!data.length || !users} loading={m.isPending} onClick={() => m.mutate()}><FileDown className="h-4 w-4" />Create export</Button>
            </div>
          </div>
        </Card>

        <Card flush title="Recent exports" sub="Links expire after 7 days.">
          {list.isLoading ? <TableSkeleton rows={4} /> : list.isError ? <ErrorState what="exports" onRetry={() => list.refetch()} /> : (
            <Table head={[{ label: 'Export' }, { label: 'Status' }, { label: '' }]} empty={<Empty icon={<Download className="h-5 w-5" />} title="No exports yet" />}>
              {list.data!.items.map((x) => (
                <Tr key={x.id}>
                  <Td><div className="font-medium">{x.name}</div><div className="text-xs text-ink-3">{x.format.toUpperCase()} · {x.rows ? `${n(x.rows)} rows · ` : ''}{dateTime(x.created_at)} · {x.created_by}</div></Td>
                  <Td className="w-[130px]">
                    {x.status === 'preparing' ? <div><div className="mb-1 text-xs text-brand">Preparing {Math.round(x.progress * 100)}%</div><Bar value={x.progress} /></div>
                      : <Chip tone={x.status === 'ready' ? 'green' : x.status === 'failed' ? 'red' : 'grey'}>{x.status[0].toUpperCase() + x.status.slice(1)}</Chip>}
                    {x.error && <div className="mt-1 text-xs text-ink-3">{x.error}</div>}
                  </Td>
                  <Td className="text-right">{x.status === 'ready' && x.download_url && <a href={api.downloadUrl(x)} download><Button size="sm"><Download className="h-3.5 w-3.5" />Download</Button></a>}</Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

const Step = ({ n: num, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section>
    <div className="mb-2.5 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-[12px] font-bold text-brand">{num}</span><span className="text-[14px] font-semibold">{title}</span></div>
    {children}
  </section>
);
