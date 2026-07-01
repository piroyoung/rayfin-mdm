/**
 * View-facing auth context and hook. Kept JSX-free and separate from
 * {@link AuthProvider} so the context object has a stable identity and the file
 * exports only hooks/values (satisfies react-refresh).
 */
import { createContext, useContext } from 'react';

import type { AuthUser } from '@/domain/ports/auth-service';

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<AuthUser>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  fabricAuthEnabled: boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
