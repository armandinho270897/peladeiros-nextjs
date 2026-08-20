'use client';
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase-browser';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(data || null);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user || null);
      loadProfile(user?.id).finally(() => setLoading(false));
      // "partida próxima": checagem única na abertura do app, não em cada
      // refresh de token — a rota é idempotente, não duplica notificação.
      if (user) {
        fetch('/api/notificacoes/verificar-proximas', { method: 'POST' })
          .then((res) => { if (!res.ok) Sentry.captureMessage(`verificar-proximas respondeu ${res.status}`, 'warning'); })
          .catch((err) => Sentry.captureException(err));
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      loadProfile(session?.user?.id);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = '/login';
  }, [supabase]);

  const value = useMemo(
    () => ({ user, profile, loading, signOut, refreshProfile: () => loadProfile(user?.id) }),
    [user, profile, loading, signOut, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
