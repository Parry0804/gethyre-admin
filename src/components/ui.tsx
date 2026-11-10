import { createContext, useCallback, useContext, useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Loader2, RefreshCw, X } from 'lucide-react';
import { initials } from '@/lib/format';

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

// ---------- Button ----------
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'md' | 'sm'; loading?: boolean };
export function Button({ variant = 'secondary', size = 'md', loading, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold whitespace-nowrap transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-[38px] px-4 text-[13.5px]' : 'h-[30px] px-3 text-[12.5px]',
        variant === 'primary' && 'bg-brand text-white hover:bg-brand-deep',
        variant === 'secondary' && 'border border-edge bg-white text-ink hover:bg-canvas',
        variant === 'danger' && 'bg-bad text-white hover:bg-bad-deep',
        variant === 'ghost' && 'text-brand hover:bg-brand-soft',
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

// ---------- Chip ----------
export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'grey';
const TONES: Record<Tone, string> = { green: 'bg-good-soft text-good', amber: 'bg-warn-soft text-warn', red: 'bg-bad-soft text-bad', blue: 'bg-brand-soft text-brand', grey: 'bg-gray-100 text-ink-2' };
export const Chip = ({ tone = 'grey', children, className }: { tone?: Tone; children: ReactNode; className?: string }) => (
  <span className={cx('inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap', TONES[tone], className)}>{children}</span>
);
export const ScoreChip = ({ v }: { v: number | null | undefined }) => (v == null ? <span className="text-ink-4">—</span> : <Chip tone={v >= 70 ? 'green' : v >= 45 ? 'amber' : 'red'}>{v}</Chip>);

export const Avatar = ({ name, size = 34 }: { name: string | null | undefined; size?: number }) => (
  <span className="inline-grid shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-brand" style={{ width: size, height: size, fontSize: size * 0.37 }}>{initials(name)}</span>
);
export const UserCell = ({ name, sub }: { name: string | null; sub?: ReactNode }) => (
  <div className="flex min-w-0 items-center gap-2.5">
    <Avatar name={name} />
    <div className="min-w-0"><div className="truncate text-[13.5px] font-semibold">{name ?? 'Unknown user'}</div>{sub && <div className="truncate text-xs text-ink-3">{sub}</div>}</div>
  </div>
);

// ---------- Layout bits ----------
export const PageHeader = ({ title, sub, crumb, actions }: { title: ReactNode; sub?: ReactNode; crumb?: ReactNode; actions?: ReactNode }) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">{crumb && <div className="mb-1 text-[13px] text-ink-3">{crumb}</div>}<h1 className="text-2xl font-bold">{title}</h1>{sub && <div className="mt-1 text-sm text-ink-3">{sub}</div>}</div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);
export function Card({ title, sub, actions, children, flush, className }: { title?: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string }) {
  return (
    <section className={cx('min-w-0 overflow-hidden rounded-[14px] border border-line bg-white shadow-card', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0"><h2 className="text-[15px] font-semibold">{title}</h2>{sub && <p className="text-[12.5px] text-ink-3">{sub}</p>}</div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </header>
      )}
      <div className={flush ? '' : 'px-5 py-4'}>{children}</div>
    </section>
  );
}
export const Stat = ({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: 'good' | 'bad' | 'muted' }) => (
  <div className="rounded-[14px] border border-line bg-white px-5 py-4 shadow-card">
    <div className="text-[13px] font-medium text-ink-3">{label}</div>
    <div className="mt-1 text-[28px] font-bold tabular-nums leading-tight">{value}</div>
    {note && <div className={cx('mt-1 text-[12.5px]', tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-ink-3')}>{note}</div>}
  </div>
);

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; count?: number }> }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-[10px] bg-gray-100 p-1" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx('rounded-lg px-3 py-1.5 text-[13px]', value === o.value ? 'bg-white font-semibold text-ink shadow-card' : 'font-medium text-ink-3 hover:text-ink')}>
          {o.label}{o.count != null && <span className="ml-1.5 text-xs text-ink-4">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export const Select = ({ value, onChange, options, label, className }: { value: string; onChange: (v: string) => void; options: Array<[string, string]>; label: string; className?: string }) => (
  <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cx('h-[38px] rounded-[10px] border border-edge bg-white px-3 text-[13.5px]', className)}>
    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
);

export const Switch = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cx('relative h-5 w-9 rounded-full transition', on ? 'bg-good' : 'bg-edge')}>
    <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition', on ? 'left-[18px]' : 'left-0.5')} />
  </button>
);

export const Bar = ({ value, tone = 'brand', h = 6 }: { value: number; tone?: 'brand' | 'good' | 'warn' | 'bad'; h?: number }) => (
  <div className="w-full overflow-hidden rounded-full bg-gray-100" style={{ height: h }}>
    <div className={cx('h-full rounded-full', { brand: 'bg-brand', good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' }[tone])} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
  </div>
);

// ---------- Tables ----------
export function Table({ head, children, empty }: { head: Array<{ label: string; className?: string }>; children: ReactNode; empty?: ReactNode }) {
  const hasRows = Array.isArray(children) ? children.flat().filter(Boolean).length > 0 : Boolean(children);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px]">
        <thead><tr className="bg-canvas">{head.map((h, i) => <th key={i} className={cx('whitespace-nowrap border-b border-line px-4 py-2.5 text-left text-xs font-semibold text-ink-3', h.className)}>{h.label}</th>)}</tr></thead>
        <tbody>{hasRows ? children : <tr><td colSpan={head.length}>{empty}</td></tr>}</tbody>
      </table>
    </div>
  );
}
export const Tr = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
  <tr onClick={onClick} className={cx('border-b border-line last:border-0', onClick && 'cursor-pointer hover:bg-canvas')}>{children}</tr>
);
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cx('px-4 py-3 align-middle', className)}>{children}</td>;

export function Pager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-[12.5px] text-ink-3">
      <span>{total ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(total, page * pageSize)} of ${total.toLocaleString('en-IN')}` : 'Nothing to show'}</span>
      <div className="flex gap-2">
        <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="h-3.5 w-3.5" />Previous</Button>
        <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next<ChevronRight className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

// ---------- States ----------
export const Empty = ({ icon, title, sub, action }: { icon?: ReactNode; title: string; sub?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
    {icon && <div className="grid h-11 w-11 place-items-center rounded-full bg-gray-100 text-ink-3">{icon}</div>}
    <div className="text-[15px] font-semibold">{title}</div>{sub && <div className="max-w-md text-[13px] text-ink-3">{sub}</div>}{action}
  </div>
);
export const ErrorState = ({ onRetry, what = 'this' }: { onRetry: () => void; what?: string }) => (
  <Empty icon={<AlertTriangle className="h-5 w-5 text-bad" />} title={`Couldn't load ${what}`} sub="The server didn't answer. Check your connection, then try again." action={<Button size="sm" onClick={onRetry}><RefreshCw className="h-3.5 w-3.5" />Try again</Button>} />
);
export const Skeleton = ({ className }: { className?: string }) => <div className={cx('animate-pulse rounded-md bg-gray-200/70', className)} />;
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div>{Array.from({ length: rows }).map((_, i) => <div key={i} className="flex items-center gap-4 border-b border-line px-5 py-4"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-3 w-40" /><Skeleton className="h-3 flex-1" /><Skeleton className="h-3 w-16" /></div>)}</div>
);
export const Banner = ({ tone, title, children, icon }: { tone: 'red' | 'amber' | 'blue' | 'grey'; title?: ReactNode; children?: ReactNode; icon?: ReactNode }) => (
  <div className={cx('flex gap-3 rounded-xl px-4 py-3 text-[13px]', { red: 'bg-bad-soft text-bad-deep', amber: 'border border-amber-200 bg-warn-soft text-warn-deep', blue: 'bg-brand-soft text-brand-deep', grey: 'bg-gray-100 text-ink-2' }[tone])}>
    {icon && <span className="mt-0.5 shrink-0">{icon}</span>}<div>{title && <div className="font-semibold">{title}</div>}{children}</div>
  </div>
);

// ---------- Dialog & Drawer ----------
export function Dialog({ open, onClose, title, sub, icon, children, footer }: { open: boolean; onClose: () => void; title: string; sub?: ReactNode; icon?: ReactNode; children?: ReactNode; footer: ReactNode }) {
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 px-4 pb-6 pt-24" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex gap-3">{icon}<div className="min-w-0 flex-1"><h2 className="text-[17px] font-bold">{title}</h2>{sub && <div className="mt-1 text-[13.5px] text-ink-3">{sub}</div>}</div></div>
        {children && <div className="mt-4 flex flex-col gap-4">{children}</div>}
        <div className="mt-5 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}
export const DialogIcon = ({ tone, children }: { tone: 'red' | 'green' | 'blue'; children: ReactNode }) => (
  <div className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-[10px]', tone === 'red' ? 'bg-bad-soft text-bad' : tone === 'green' ? 'bg-good-soft text-good' : 'bg-brand-soft text-brand')}>{children}</div>
);
export function Drawer({ onClose, title, sub, children, footer }: { onClose: () => void; title: ReactNode; sub?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" className="flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl">
        <header className="flex items-start gap-3 border-b border-line px-6 py-5"><div className="min-w-0 flex-1"><div className="text-lg font-bold">{title}</div>{sub && <div className="mt-1 text-[13px] text-ink-3">{sub}</div>}</div><button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg border border-edge text-ink-3 hover:bg-canvas"><X className="h-4 w-4" /></button></header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex items-center justify-between gap-2 border-t border-line px-6 py-4">{footer}</footer>}
      </aside>
    </div>
  );
}

export const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) => (
  <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-semibold text-ink-2">{label}</span>{children}{hint && <span className="text-xs text-ink-3">{hint}</span>}</label>
);
export const inputCls = 'h-[40px] w-full rounded-[10px] border border-edge bg-white px-3 text-[14px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

// ---------- Toasts ----------
type ToastT = { id: number; tone: 'success' | 'error' | 'info'; title: string; body?: string };
const ToastCtx = createContext<(t: Omit<ToastT, 'id'>) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<ToastT[]>([]);
  const push = useCallback((t: Omit<ToastT, 'id'>) => { const id = Date.now() + Math.random(); setList((l) => [...l, { ...t, id }]); setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 4500); }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-6 right-6 z-[60] flex w-[min(420px,calc(100vw-32px))] flex-col gap-2" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className="flex items-start gap-3 rounded-xl bg-ink px-4 py-3.5 text-white shadow-2xl">
            {t.tone === 'error' ? <AlertTriangle className="mt-0.5 h-4 w-4 text-red-400" /> : t.tone === 'info' ? <RefreshCw className="mt-0.5 h-4 w-4 text-blue-300" /> : <Check className="mt-0.5 h-4 w-4 text-emerald-400" />}
            <div className="min-w-0 flex-1"><div className="text-[13.5px] font-semibold">{t.title}</div>{t.body && <div className="text-[12.5px] text-gray-300">{t.body}</div>}</div>
            <button aria-label="Close" onClick={() => setList((l) => l.filter((x) => x.id !== t.id))}><X className="h-4 w-4 text-gray-400" /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
