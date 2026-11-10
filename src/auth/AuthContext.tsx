import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Admin } from '@/api/types';

interface AuthState { admin: Admin | null; checking: boolean; signedOutReason: 'signed_out' | 'expired' | null; setAdmin: (a: Admin | null) => void; signOut: () => Promise<void> }
const Ctx = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [checking, setChecking] = useState(true);
  const [signedOutReason, setReason] = useState<AuthState['signedOutReason']>(null);
  const qc = useQueryClient();

  useEffect(() => {
    api.me().then((r) => setAdmin(r.admin)).catch(() => setAdmin(null)).finally(() => setChecking(false));
    // Any API call that comes back 401 means the session ended.
    const onExpired = () => { setAdmin(null); setReason('expired'); qc.clear(); };
    window.addEventListener('admin:signed-out', onExpired);
    return () => window.removeEventListener('admin:signed-out', onExpired);
  }, [qc]);

  const signOut = async () => { await api.logout().catch(() => {}); qc.clear(); setAdmin(null); setReason('signed_out'); };
  return <Ctx.Provider value={{ admin, checking, signedOutReason, setAdmin: (a) => { setAdmin(a); setReason(null); }, signOut }}>{children}</Ctx.Provider>;
}
