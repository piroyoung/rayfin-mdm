/**
 * Tracks the currently signed-in user as the "actor" for audit + stewardship
 * stamping, without coupling the service layer to React. `AppLayout` keeps this
 * in sync with `useAuth()`.
 */
import type { AuthUser } from '@/services/IAuthService';

let current: AuthUser | null = null;

export function setCurrentActor(user: AuthUser | null): void {
  current = user;
}

export function getCurrentActor(): AuthUser | null {
  return current;
}

/** Stable string used for `createdBy` / `updatedBy` / audit `actor`. */
export function actorId(): string {
  return current?.email || current?.name || current?.id || 'system';
}
