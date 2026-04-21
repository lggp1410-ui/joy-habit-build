import { useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  name?: string;
  avatar?: string;
}

interface AuthState {
  user: AuthUser | null;
  isGuest: boolean;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isGuest: localStorage.getItem('planlizz-guest') === 'true',
    loading: true,
  });

  useEffect(() => {
    fetch('/api/auth/user', { credentials: 'include' })
      .then((r) => r.json())
      .then(({ user }) => {
        setState((prev) => ({
          ...prev,
          user: user ?? null,
          isGuest: !user ? prev.isGuest : false,
          loading: false,
        }));
      })
      .catch(() => {
        setState((prev) => ({ ...prev, loading: false }));
      });
  }, []);

  const continueAsGuest = async () => {
    await fetch('/api/auth/guest', { method: 'POST', credentials: 'include' });
    localStorage.setItem('planlizz-guest', 'true');
    setState((prev) => ({
      ...prev,
      isGuest: true,
      user: { id: 'guest', name: 'Guest' },
    }));
  };

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('planlizz-guest');
    setState({ user: null, isGuest: false, loading: false });
  };

  const signInWithGoogle = () => {
    const loginUrl = `${window.location.origin}/api/auth/login`;
    const isEmbedded = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    if (isEmbedded) {
      window.open(loginUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    window.location.assign(loginUrl);
  };

  const isAuthenticated = !!state.user || state.isGuest;

  return { ...state, isAuthenticated, continueAsGuest, signOut, signInWithGoogle };
}
