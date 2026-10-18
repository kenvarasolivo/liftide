"use client";
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';

type User = { id: string; email: string; name?: string; image?: string | null };
type Auth = { user: User | null; loading: boolean; configured: boolean; error: string; refresh: () => Promise<void> };
const AuthContext = createContext<Auth>({ user: null, loading: true, configured: false, error: '', refresh: async () => {} });
const USER_CACHE = 'liftide:neon-user';
function offlineUser(): User | null {
  try {
    const user = JSON.parse(localStorage.getItem(USER_CACHE) ?? 'null');
    return user && typeof user.id === 'string' && typeof user.email === 'string' ? user : null;
  } catch { return null; }
}
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<Auth, 'refresh'>>({ user: null, loading: true, configured: false, error: '' });
  const refresh = useCallback(async () => {
    if (!navigator.onLine) {
      // Cached identity enables offline workouts only; API authorization always
      // comes from a verified server session, never this browser cache.
      const user = offlineUser();
      setState({ user, configured: Boolean(user), loading: false, error: '' }); return;
    }
    try {
      const response = await fetch('/api/config', { cache: 'no-store' });
      if (!response.ok) throw new Error('Account service unavailable');
      const { configured } = await response.json();
      if (!configured) { setState({ user: null, loading: false, configured: false, error: '' }); return; }
      const { data, error } = await authClient.getSession();
      if (error) throw new Error(error.message);
      const user = data?.user ? { id: data.user.id, email: data.user.email, name: data.user.name, image: data.user.image } : null;
      try { if (user) localStorage.setItem(USER_CACHE, JSON.stringify(user)); else localStorage.removeItem(USER_CACHE); } catch {}
      setState({ user, loading: false, configured: true, error: '' });
    } catch {
      // A temporary network failure must not turn a remembered account into
      // guest mode. Cached identity never authorizes an API request.
      const cached = offlineUser();
      setState(s => ({ ...s, user: s.user ?? cached, configured: s.configured || Boolean(cached), loading: false, error: 'Account connection unavailable. We’ll reconnect when you’re back online.' }));
    }
  }, []);
  useEffect(() => {
    void refresh();
    const changed = () => { void refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const stored = (event: StorageEvent) => { if (event.key === USER_CACHE) void refresh(); };
    window.addEventListener('online', changed); window.addEventListener('storage', stored); document.addEventListener('visibilitychange', visible);
    return () => { window.removeEventListener('online', changed); window.removeEventListener('storage', stored); document.removeEventListener('visibilitychange', visible); };
  }, [refresh]);
  return <AuthContext.Provider value={{ ...state, refresh }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
