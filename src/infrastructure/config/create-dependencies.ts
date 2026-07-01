/**
 * Factory that assembles the {@link AppDependencies} graph from config and the
 * Rayfin client facade. This is the one place concrete adapters are constructed;
 * the composition root calls it and hands the result to the DI provider.
 */
import type { AppDependencies } from '@/di/dependencies';
import { SessionActorContext } from '@/infrastructure/auth/session-actor-context';
import { RayfinAuditLog } from '@/infrastructure/data/rayfin-audit-log';
import { RayfinFiscalYearRepository } from '@/infrastructure/data/rayfin-fiscal-year-repository';
import { RayfinReferenceRepository } from '@/infrastructure/data/rayfin-reference-repository';
import { RayfinRoleRepository } from '@/infrastructure/data/rayfin-role-repository';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

export function createDependencies(
  client: RayfinClientFacade
): AppDependencies {
  const actor = new SessionActorContext(client);
  const audit = new RayfinAuditLog(client, actor);
  const roles = new RayfinRoleRepository(client, actor);
  const reference = new RayfinReferenceRepository(client, actor);
  const fiscalYears = new RayfinFiscalYearRepository(client, actor);
  return { actor, audit, roles, reference, fiscalYears };
}
