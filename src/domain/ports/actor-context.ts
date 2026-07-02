/**
 * Outbound port exposing the current actor for stewardship stamping and audit
 * entries. Implemented by an adapter that reads the live Fabric/mock session, so
 * request/user state never lives in a module-level mutable singleton.
 */
import type { AuthUser } from './auth-service';

export interface ActorContext {
  /** The signed-in user, or `null` when unauthenticated. */
  current(): AuthUser | null;

  /** Stable identifier used for `createdBy` / `updatedBy` and the audit `actor`. */
  actorId(): string;
}
