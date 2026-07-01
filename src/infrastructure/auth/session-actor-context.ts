/**
 * {@link ActorContext} adapter backed by the live Rayfin session.
 *
 * Reads the current user straight from the client's auth session on every call,
 * so there is no module-level mutable actor to fall out of sync — the session is
 * the single source of truth.
 */
import type { ActorContext } from '@/domain/ports/actor-context';
import type { AuthUser } from '@/domain/ports/auth-service';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

import { toAuthUser } from './to-auth-user';

export class SessionActorContext implements ActorContext {
  constructor(private readonly client: RayfinClientFacade) {}

  current(): AuthUser | null {
    const session = this.client.auth.getSession();
    if (!session.isAuthenticated || !session.user) return null;
    return toAuthUser(session.user);
  }

  actorId(): string {
    const user = this.current();
    return user?.email || user?.name || user?.id || 'system';
  }
}
