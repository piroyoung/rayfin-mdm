/**
 * Outbound port that publishes the current actor to side systems. The migrated
 * stack reads the actor from the live session via {@link ActorContext}; this
 * sink exists only to keep legacy backlog services (which still read a
 * module-level actor) attributing writes to the signed-in user. It is fed
 * reactively from the auth session at the composition edge and disappears once
 * the last legacy service is migrated onto ports.
 */
import type { AuthUser } from './auth-service';

export interface ActorSink {
  /** Publish the signed-in user, or `null` when unauthenticated. */
  set(user: AuthUser | null): void;
}
