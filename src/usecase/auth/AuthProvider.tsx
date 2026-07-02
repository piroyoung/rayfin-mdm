import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { AuthService, AuthUser } from '@/domain/ports/auth-service';

import { AuthContext, type AuthContextValue } from './auth-context';

interface AuthProviderProps {
  children: ReactNode;
  authService: AuthService;
}

/**
 * Owns the authentication view state (current user, loading, error) and adapts
 * the injected {@link AuthService} port into the {@link AuthContextValue} the UI
 * consumes through `useAuth`. The service is injected, never constructed here.
 */
export function AuthProvider({ children, authService }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authService
      .initEmbeddedAuth()
      .then((embedded) => embedded ?? authService.getCurrentUser())
      .then((current) => {
        if (!cancelled && current) setUser(current);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authService]);

  const signIn = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const loggedInUser = await authService.signIn();
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authService]);

  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, [authService]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      signIn,
      signOut,
      isAuthenticated: !!user,
      fabricAuthEnabled: authService.fabricAuthEnabled,
    }),
    [user, loading, error, signIn, signOut, authService]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
