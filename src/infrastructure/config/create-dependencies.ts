/**
 * Factory that assembles the {@link AppDependencies} graph from config and the
 * Rayfin client facade. This is the one place concrete adapters are constructed;
 * the composition root calls it and hands the result to the DI provider.
 */
import type { AppDependencies } from '@/di/dependencies';
import { SessionActorContext } from '@/infrastructure/auth/session-actor-context';
import { RayfinAccountRepository } from '@/infrastructure/data/rayfin-account-repository';
import { RayfinAuditLog } from '@/infrastructure/data/rayfin-audit-log';
import { RayfinChangeRequestRepository } from '@/infrastructure/data/rayfin-change-request-repository';
import { RayfinEmployeeRepository } from '@/infrastructure/data/rayfin-employee-repository';
import { RayfinFiscalYearRepository } from '@/infrastructure/data/rayfin-fiscal-year-repository';
import { RayfinReferenceRepository } from '@/infrastructure/data/rayfin-reference-repository';
import { RayfinRoleRepository } from '@/infrastructure/data/rayfin-role-repository';
import { RayfinTerritoryRepository } from '@/infrastructure/data/rayfin-territory-repository';
import { RayfinTerritoryAccountAssignmentRepository } from '@/infrastructure/data/rayfin-territory-account-assignment-repository';
import { RayfinTerritoryRoleAssignmentRepository } from '@/infrastructure/data/rayfin-territory-role-assignment-repository';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

export function createDependencies(
  client: RayfinClientFacade
): AppDependencies {
  const actor = new SessionActorContext(client);
  const audit = new RayfinAuditLog(client, actor);
  const roles = new RayfinRoleRepository(client, actor);
  const reference = new RayfinReferenceRepository(client, actor);
  const fiscalYears = new RayfinFiscalYearRepository(client, actor);
  const employees = new RayfinEmployeeRepository(client, actor);
  const territories = new RayfinTerritoryRepository(client, actor);
  const territoryAccountAssignments =
    new RayfinTerritoryAccountAssignmentRepository(client, actor);
  const territoryRoleAssignments = new RayfinTerritoryRoleAssignmentRepository(
    client,
    actor
  );
  const accounts = new RayfinAccountRepository(client, actor);
  const changeRequests = new RayfinChangeRequestRepository(client, actor);
  return {
    actor,
    audit,
    roles,
    reference,
    fiscalYears,
    employees,
    territories,
    territoryAccountAssignments,
    territoryRoleAssignments,
    accounts,
    changeRequests,
  };
}
