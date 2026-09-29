import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { arrivedFromRecoveryLink, clearRecoveryFlag, supabase } from './supabase';

interface AuthState {
  session: Session | null;
  email: string | null;
  /** True until the stored session has been read on first load. */
  loading: boolean;
  /** True after arriving from a password-reset email link. */
  recovery: boolean;
  finishRecovery: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Signs out this browser only (other devices stay signed in). */
export async function signOutLocal() {
  await supabase.auth.signOut({ scope: 'local' });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(arrivedFromRecoveryLink);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setRecovery(arrivedFromRecoveryLink());
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') {
        setRecovery(false);
        queryClient.clear();
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      email: session?.user.email ?? null,
      loading,
      recovery,
      finishRecovery: () => {
        clearRecoveryFlag();
        setRecovery(false);
      },
      signOut: signOutLocal,
    }),
    [session, loading, recovery],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
