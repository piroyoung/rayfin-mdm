/**
 * {@link ActorSink} bridge that keeps the legacy `services/session` module actor
 * in sync with the signed-in user, so backlog services still under
 * `src/services/` (notably the first-run seeder) attribute their writes
 * correctly. This adapter is the single place the legacy session global is
 * touched; when those services are migrated onto ports it is deleted with them.
 */
import type { ActorSink } from '@/domain/ports/actor-sink';
import type { AuthUser } from '@/domain/ports/auth-service';
import { setCurrentActor } from '@/services/session';

export class LegacyActorSink implements ActorSink {
  set(user: AuthUser | null): void {
    setCurrentActor(user);
  }
}
