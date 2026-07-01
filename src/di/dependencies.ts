/**
 * The injected dependency graph.
 *
 * {@link AppDependencies} is the aggregate of outbound ports the view layer
 * consumes through {@link useDependencies}. It only ever exposes domain ports —
 * never the Rayfin client or an infrastructure type — so no use case or
 * component can reach the SDK. The graph is assembled once by
 * `createDependencies` in the composition root and grows one repository port per
 * migrated feature.
 */
import type { ActorContext } from '@/domain/ports/actor-context';
import type { AuditLog } from '@/domain/ports/audit-log';

export interface AppDependencies {
  /** Current actor for stewardship stamping and audit attribution. */
  actor: ActorContext;
  /** Immutable audit trail. */
  audit: AuditLog;
}
