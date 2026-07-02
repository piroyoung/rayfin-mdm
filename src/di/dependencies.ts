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
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { ChangeRequestRepository } from '@/domain/repositories/change-request-repository';
import type { DataQualityIssueRepository } from '@/domain/repositories/data-quality-issue-repository';
import type { EmployeeRepository } from '@/domain/repositories/employee-repository';
import type { FiscalYearRepository } from '@/domain/repositories/fiscal-year-repository';
import type { ReferenceRepository } from '@/domain/repositories/reference-repository';
import type { RoleRepository } from '@/domain/repositories/role-repository';
import type { SourceXrefRepository } from '@/domain/repositories/source-xref-repository';
import type { SeedService } from '@/domain/ports/seed-service';
import type { TerritoryRepository } from '@/domain/repositories/territory-repository';
import type { TerritoryAccountAssignmentRepository } from '@/domain/repositories/territory-account-assignment-repository';
import type { TerritoryRoleAssignmentRepository } from '@/domain/repositories/territory-role-assignment-repository';

export interface AppDependencies {
  /** Current actor for stewardship stamping and audit attribution. */
  actor: ActorContext;
  /** Immutable audit trail. */
  audit: AuditLog;
  /** Role master catalogue. */
  roles: RoleRepository;
  /** Governed reference code lists. */
  reference: ReferenceRepository;
  /** Fiscal-year master (drives the current operating year). */
  fiscalYears: FiscalYearRepository;
  /** Employee (sales-team-member) master. */
  employees: EmployeeRepository;
  /** Territory / POD / sales-unit master. */
  territories: TerritoryRepository;
  /** Account-to-territory placement (fiscal-year scoped). */
  territoryAccountAssignments: TerritoryAccountAssignmentRepository;
  /** Territory role-seat roster (single current holder per seat). */
  territoryRoleAssignments: TerritoryRoleAssignmentRepository;
  /** Account master with stewardship lifecycle. */
  accounts: AccountRepository;
  /** Change-request approval tickets. */
  changeRequests: ChangeRequestRepository;
  /** Data-quality triage queue. */
  dataQualityIssues: DataQualityIssueRepository;
  /** Source-system cross-references for ingested records. */
  sourceXrefs: SourceXrefRepository;
  /** First-run demo seeding (local backend only). */
  seed: SeedService;
}
