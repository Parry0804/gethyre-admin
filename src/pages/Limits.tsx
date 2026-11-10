import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gauge, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/api/client';
import type { LimitOverride, Plan, PlanLimit } from '@/api/types';
import { date, FEATURE_LABEL, n, PLAN_LABEL, RESETS_LABEL } from '@/lib/format';
import { Banner, Button, Card, Chip, Dialog, DialogIcon, Empty, ErrorState, Field, PageHeader, Select, Skeleton, Switch, Table, Td, Tr, UserCell, useToast } from '@/components/ui';

export default function Limits() {
  const q = useQuery({ queryKey: ['limits'], queryFn: api.limits });
  const [editing, setEditing] = useState<Plan | null>(null);
  const [removing, setRemoving] = useState<LimitOverride | null>(null);
  const nav = useNavigate();
  if (q.isError) return <Card><ErrorState what="limits" onRetry={() => q.refetch()} /></Card>;
  const d = q.data;

  return (
    <>
      <PageHeader title="Plans and limits" sub="How many times each plan can use the AI features. Changes apply to everyone on that plan right away." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {(['free', 'pro'] as Plan[]).map((plan) => (
          <Card key={plan} flush title={<span className="flex items-center gap-2">{PLAN_LABEL[plan]} plan <Chip tone={plan === 'pro' ? 'blue' : 'grey'}>{d ? `${n(d.plan_users[plan])} users` : '…'}</Chip></span>}
            actions={<Button size="sm" onClick={() => setEditing(plan)} disabled={!d}><Pencil className="h-3.5 w-3.5" />Edit limits</Button>}>
            {!d ? <Skeleton className="m-5 h-24" /> : (
              <Table head={[{ label: 'Feature' }, { label: 'Limit' }, { label: 'Resets' }, { label: 'At limit' }]}>
                {d.limits.filter((l) => l.plan === plan).map((l) => (
                  <Tr key={l.feature}>
                    <Td><div className="font-medium">{FEATURE_LABEL[l.feature]}</div>{!l.enabled && <div className="text-xs text-bad">Turned off for this plan</div>}</Td>
                    <Td>{!l.enabled ? '—' : l.limit == null ? <Chip>No limit</Chip> : <span className="font-semibold">{l.limit}</span>}</Td>
                    <Td className="text-ink-2">{l.limit == null ? '—' : RESETS_LABEL[l.resets]}</Td>
                    <Td>{l.users_at_limit ? <Chip tone="amber">{n(l.users_at_limit)} users</Chip> : <span className="text-ink-4">0</span>}</Td>
                  </Tr>
                ))}
              </Table>
            )}
          </Card>
        ))}
      </div>

      <Card flush title="Extra uses for single users" sub="Given from a user's profile. They add to the plan limit for that user only.">
        {!d ? <Skeleton className="m-5 h-24" /> : (
          <Table head={[{ label: 'User' }, { label: 'Feature' }, { label: 'Extra' }, { label: 'Reason' }, { label: 'Ends' }, { label: '' }]}
            empty={<Empty icon={<Gauge className="h-5 w-5" />} title="No extra uses given" sub="Open a user and choose Change limits to give some." />}>
            {d.overrides.map((o) => (
              <Tr key={o.id} onClick={() => nav(`/users/${o.user.id}`)}>
                <Td><UserCell name={o.user.full_name} sub={`${PLAN_LABEL[o.user.plan]} plan`} /></Td>
                <Td>{FEATURE_LABEL[o.feature]}</Td>
                <Td className="font-semibold">+{o.extra}</Td>
                <Td className="max-w-[240px] text-ink-2">{o.reason}<div className="text-xs text-ink-4">by {o.set_by}, {date(o.created_at)}</div></Td>
                <Td className="whitespace-nowrap">{o.ends_at ? date(o.ends_at) : 'No end date'}</Td>
                <Td className="text-right"><span onClick={(e) => e.stopPropagation()}><Button size="sm" variant="ghost" onClick={() => setRemoving(o)}><Trash2 className="h-3.5 w-3.5" />Remove</Button></span></Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {d && editing && <EditLimitsDialog plan={editing} users={d.plan_users[editing]} limits={d.limits.filter((l) => l.plan === editing)} onClose={() => setEditing(null)} />}
      <RemoveOverrideDialog o={removing} onClose={() => setRemoving(null)} />
    </>
  );
}

function EditLimitsDialog({ plan, users, limits, onClose }: { plan: Plan; users: number; limits: PlanLimit[]; onClose: () => void }) {
  const [rows, setRows] = useState(limits.map((l) => ({ feature: l.feature, limit: l.limit, resets: l.resets, enabled: l.enabled })));
  const qc = useQueryClient();
  const toast = useToast();
  const upd = (i: number, p: Partial<(typeof rows)[number]>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const lowered = rows.some((r, i) => r.limit != null && (limits[i].limit == null || r.limit < limits[i].limit!));
  const m = useMutation({
    mutationFn: () => api.saveLimits(plan, rows),
    onSuccess: (data) => { qc.setQueryData(['limits'], data); qc.invalidateQueries({ queryKey: ['user'] }); toast({ tone: 'success', title: `${PLAN_LABEL[plan]} limits saved`, body: `Applies to ${n(users)} users now.` }); onClose(); },
    onError: () => toast({ tone: 'error', title: "Limits weren't saved", body: 'The server did not answer. Try again.' }),
  });
  return (
    <Dialog open onClose={onClose} icon={<DialogIcon tone="blue"><Gauge className="h-5 w-5" /></DialogIcon>} title={`Edit ${PLAN_LABEL[plan]} limits`} sub={`Affects ${n(users)} users on this plan.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={m.isPending} onClick={() => m.mutate()}>Save limits</Button></>}>
      {rows.map((r, i) => (
        <div key={r.feature} className="flex flex-col gap-3 rounded-[12px] border border-edge p-4">
          <div className="flex items-center justify-between"><span className="text-[14px] font-semibold">{FEATURE_LABEL[r.feature]}</span><Switch on={r.enabled} onChange={(v) => upd(i, { enabled: v })} label={`Turn ${FEATURE_LABEL[r.feature]} on`} /></div>
          {r.enabled && <>
            <Field label="Uses allowed">
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={r.limit == null || r.limit <= 0} onClick={() => upd(i, { limit: Math.max(0, (r.limit ?? 1) - 1) })} aria-label="Fewer">−</Button>
                <span className="w-12 text-center text-[15px] font-semibold">{r.limit ?? '∞'}</span>
                <Button size="sm" onClick={() => upd(i, { limit: (r.limit ?? 0) + 1 })} aria-label="More">+</Button>
                <label className="ml-3 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={r.limit == null} onChange={(e) => upd(i, { limit: e.target.checked ? null : 1 })} />No limit</label>
              </div>
            </Field>
            {r.limit != null && <Field label="Resets"><Select label="Resets" className="w-full" value={r.resets} onChange={(v) => upd(i, { resets: v as PlanLimit['resets'] })} options={Object.entries(RESETS_LABEL) as Array<[string, string]>} /></Field>}
          </>}
        </div>
      ))}
      {lowered && <Banner tone="amber">Lowering a limit doesn't take back uses. Users already over the new limit just can't start another one.</Banner>}
    </Dialog>
  );
}

function RemoveOverrideDialog({ o, onClose }: { o: LimitOverride | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const m = useMutation({
    mutationFn: () => api.removeOverride(o!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['limits'] }); qc.invalidateQueries({ queryKey: ['user'] }); toast({ tone: 'success', title: 'Extra uses removed' }); onClose(); },
    onError: () => toast({ tone: 'error', title: "Couldn't remove", body: 'The server did not answer. Try again.' }),
  });
  return (
    <Dialog open={!!o} onClose={onClose} icon={<DialogIcon tone="red"><Trash2 className="h-5 w-5" /></DialogIcon>} title="Remove extra uses?"
      sub={o ? `${o.user.full_name ?? 'This user'} goes back to the ${PLAN_LABEL[o.user.plan]} plan limit for ${FEATURE_LABEL[o.feature].toLowerCase()}.` : ''}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" loading={m.isPending} onClick={() => m.mutate()}>Remove</Button></>} />
  );
}
