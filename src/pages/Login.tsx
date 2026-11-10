import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertTriangle, Eye, EyeOff, Lock, LogOut } from 'lucide-react';
import { api, ApiError } from '@/api/client';
import type { LoginFailed, LoginLocked } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Banner, Button, Field, inputCls, cx } from '@/components/ui';
import { dateTime } from '@/lib/format';

export default function Login() {
  const { admin, setAdmin, signedOutReason } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ kind: 'wrong'; left: number } | { kind: 'locked'; until: string } | { kind: 'network' } | null>(null);
  if (admin) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true); setErr(null);
    try { const r = await api.login({ username: username.trim(), password }); setAdmin(r.admin); }
    catch (x) {
      if (x instanceof ApiError && x.status === 401) setErr({ kind: 'wrong', left: (x.body as LoginFailed).tries_left });
      else if (x instanceof ApiError && x.status === 423) setErr({ kind: 'locked', until: (x.body as LoginLocked).locked_until });
      else setErr({ kind: 'network' });
      setPassword('');
    } finally { setBusy(false); }
  };
  const locked = err?.kind === 'locked';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <form onSubmit={submit} className="flex w-full max-w-[420px] flex-col gap-[18px] rounded-2xl border border-line bg-white p-9 shadow-card">
        <div className="bg-gradient-to-r from-brand to-violet-600 bg-clip-text text-2xl font-bold text-transparent">GetHyre.ai</div>
        {signedOutReason && !err && (
          <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand"><LogOut className="h-5 w-5" /></div>
        )}
        <div>
          <h1 className="text-xl font-bold">{signedOutReason && !err ? "You're signed out" : 'Admin sign in'}</h1>
          <p className="mt-1.5 text-[13.5px] text-ink-3">{signedOutReason === 'expired' && !err ? 'Your session ended after a long time without activity. Sign in again to continue.' : signedOutReason === 'signed_out' && !err ? 'Sign in again to continue.' : 'Use the admin user ID and password you were given.'}</p>
        </div>
        {err?.kind === 'wrong' && <Banner tone="red" icon={<AlertTriangle className="h-4 w-4" />}>Wrong user ID or password. {err.left} {err.left === 1 ? 'try' : 'tries'} left before sign-in locks for 15 minutes.</Banner>}
        {locked && <Banner tone="amber" icon={<Lock className="h-4 w-4" />}>Too many wrong tries. Sign-in is locked until {dateTime(err.until)}. Ask the tech team if you're stuck.</Banner>}
        {err?.kind === 'network' && <Banner tone="red" icon={<AlertTriangle className="h-4 w-4" />}>Couldn't reach the server. Check your connection and try again.</Banner>}
        <Field label="User ID"><input className={inputCls} autoComplete="username" autoFocus value={username} disabled={locked} onChange={(e) => setUsername(e.target.value)} /></Field>
        <Field label="Password">
          <div className="relative">
            <input className={cx(inputCls, 'pr-10', err?.kind === 'wrong' && 'border-bad ring-2 ring-bad/15')} type={show ? 'text' : 'password'} autoComplete="current-password" value={password} disabled={locked} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-3 text-ink-3">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
        </Field>
        <Button type="submit" variant="primary" className="h-11" loading={busy} disabled={locked || !username.trim() || !password}>{locked ? 'Locked for 15 minutes' : 'Sign in'}</Button>
        <p className="text-[12.5px] text-ink-3">Forgot your password? Ask the GetHyre tech team to reset it.</p>
        {import.meta.env.VITE_USE_MOCKS !== 'false' && <p className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-ink-2">Sample data mode. Sign in with <b>pranay</b> / <b>gethyre-demo</b>.</p>}
      </form>
      <div className="text-[12.5px] text-ink-4">GetHyre admin · for the GetHyre team only</div>
    </div>
  );
}
