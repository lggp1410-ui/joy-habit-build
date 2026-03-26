import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isGuest: localStorage.getItem('planlizz-guest') === 'true',
    loading: true,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
        isGuest: !session ? prev.isGuest : false,
        loading: false,
      }));
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
        loading: false,
      }));
    });

    return () => subscription.unsubscribe();
  }, []);

  const continueAsGuest = () => {
    localStorage.setItem('planlizz-guest', 'true');
    setState(prev => ({ ...prev, isGuest: true }));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('planlizz-guest');
    setState({ user: null, session: null, isGuest: false, loading: false });
  };

  const isAuthenticated = !!state.user || state.isGuest;

  return { ...state, isAuthenticated, continueAsGuest, signOut };
}
