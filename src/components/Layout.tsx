import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Download, FileText, LayoutGrid, LogOut, MessageSquare, Menu, Search, SlidersHorizontal, Users } from 'lucide-react';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Avatar, cx } from './ui';
import { date } from '@/lib/format';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/resumes', label: 'Resumes', icon: FileText },
  { to: '/interviews', label: 'Interviews', icon: MessageSquare },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/limits', label: 'Plans and limits', icon: SlidersHorizontal },
  { to: '/exports', label: 'Exports', icon: Download },
];

function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hl, setHl] = useState(0);
  const nav = useNavigate();
  const box = useRef<HTMLDivElement>(null);
  const { data } = useQuery({ queryKey: ['search', q], queryFn: () => api.search(q), enabled: q.trim().length >= 2 });
  const items = data?.items ?? [];
  useEffect(() => { const c = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false); document.addEventListener('mousedown', c); return () => document.removeEventListener('mousedown', c); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); box.current?.querySelector('input')?.focus(); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const go = (path: string) => { setOpen(false); setQ(''); nav(path); };
  return (
    <div ref={box} className="relative w-full max-w-[400px]">
      <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-ink-4" />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); setHl(0); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') setHl((h) => Math.min(h + 1, items.length)); if (e.key === 'ArrowUp') setHl((h) => Math.max(h - 1, 0)); if (e.key === 'Enter') { if (items[hl]) go(`/users/${items[hl].id}`); else if (q.trim()) go(`/users?q=${encodeURIComponent(q.trim())}`); } if (e.key === 'Escape') setOpen(false); }}
        placeholder="Search users by name, phone or email" aria-label="Search users"
        className="h-10 w-full rounded-[10px] border border-edge bg-canvas pl-10 pr-3 text-[13.5px] outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20" />
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-40 rounded-xl border border-edge bg-white p-1.5 shadow-xl">
          <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-4">Users</div>
          {items.length === 0 && <div className="px-3 py-3 text-[13px] text-ink-3">No user matches "{q}".</div>}
          {items.map((u, i) => (
            <button key={u.id} onMouseEnter={() => setHl(i)} onClick={() => go(`/users/${u.id}`)} className={cx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left', hl === i && 'bg-brand-soft')}>
              <Avatar name={u.full_name} /><div className="min-w-0"><div className="truncate text-[13.5px] font-semibold">{u.full_name}</div><div className="truncate text-xs text-ink-3">{[u.phone, u.email].filter(Boolean).join(' · ') || `Signed up ${date(u.created_at)}`}</div></div>
            </button>
          ))}
          {q.trim() && <button onClick={() => go(`/users?q=${encodeURIComponent(q.trim())}`)} className={cx('w-full rounded-lg px-2.5 py-2.5 text-left text-[13px] font-medium text-brand', hl === items.length && 'bg-brand-soft')}>See all results for "{q.trim()}"</button>}
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { admin, signOut } = useAuth();
  const [menu, setMenu] = useState(false);
  return (
    <div className="flex min-h-screen">
      <aside className={cx('fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-edge bg-white px-3 py-6 transition-transform lg:translate-x-0', menu ? 'translate-x-0' : '-translate-x-full')}>
        <div className="px-3.5"><div className="bg-gradient-to-r from-brand to-violet-600 bg-clip-text text-[22px] font-bold text-transparent">GetHyre.ai</div><div className="text-[12.5px] font-medium text-ink-3">Admin</div></div>
        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: I, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenu(false)} className={({ isActive }) => cx('flex h-10 items-center gap-3 rounded-[10px] px-3.5 text-sm', isActive ? 'bg-brand-soft font-semibold text-brand' : 'font-medium text-ink-2 hover:bg-canvas')}>
              <I className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-canvas p-3">
          <Avatar name={admin?.full_name} /><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold">{admin?.full_name}</div><div className="text-xs text-ink-3">Super admin</div></div>
          <button onClick={signOut} aria-label="Sign out" title="Sign out" className="rounded-md p-1 text-ink-3 hover:bg-white hover:text-ink"><LogOut className="h-4 w-4" /></button>
        </div>
      </aside>
      {menu && <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setMenu(false)} />}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-56">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-edge bg-white px-4 sm:px-8">
          <button className="rounded-md p-1.5 lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <GlobalSearch />
          <div className="ml-auto hidden text-[13px] text-ink-3 sm:block">{date(new Date().toISOString())}</div>
        </header>
        <main className="mx-auto flex w-full max-w-[1216px] flex-col gap-6 px-4 py-7 sm:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
