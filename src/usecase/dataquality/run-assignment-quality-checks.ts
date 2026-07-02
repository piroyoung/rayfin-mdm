/**
 * Assignment data-quality rule run: read the current assignment graph, evaluate
 * the domain quality rules, and persist any findings that are not already open.
 * The detection rules live in `@/domain/assignmentQuality`; this orchestration
 * only gathers inputs and delegates persistence to the issue operations. Reused
 * by the Data Quality screen and the ingest pipeline.
 */
import {
  evaluateAssignmentQuality,
  newFindings,
  ASSIGNMENT_QUALITY_PROCESS,
} from '@/domain/assignmentQuality';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { EmployeeRepository } from '@/domain/repositories/employee-repository';
import type { TerritoryRepository } from '@/domain/repositories/territory-repository';
import type { TerritoryAccountAssignmentRepository } from '@/domain/repositories/territory-account-assignment-repository';
import type { TerritoryRoleAssignmentRepository } from '@/domain/repositories/territory-role-assignment-repository';
import {
  createIssues,
  type QualityIssueDeps,
} from '@/usecase/dataquality/quality-issue-operations';

export interface QualityCheckDeps extends QualityIssueDeps {
  accounts: AccountRepository;
  employees: EmployeeRepository;
  territories: TerritoryRepository;
  territoryAccountAssignments: TerritoryAccountAssignmentRepository;
  territoryRoleAssignments: TerritoryRoleAssignmentRepository;
}

/**
 * Run the assignment quality rules and persist newly-detected issues. Returns
 * the number of new issues raised.
 */
export async function runAssignmentQualityChecks(
  deps: QualityCheckDeps
): Promise<number> {
  const [
    accounts,
    employees,
    territories,
    territoryAssignments,
    territoryRoleAssignments,
    existing,
  ] = await Promise.all([
    deps.accounts.list(),
    deps.employees.list(),
    deps.territories.list(),
    deps.territoryAccountAssignments.list(),
    deps.territoryRoleAssignments.list(),
    deps.dataQualityIssues.list(),
  ]);

  const findings = evaluateAssignmentQuality({
    accounts,
    employees,
    territories,
    territoryAssignments,
    territoryRoleAssignments,
  });
  const toRaise = newFindings(findings, existing);

  return createIssues(
    deps,
    toRaise.map((f) => ({
      entityType: f.entityType,
      entityId: f.entityId,
      issueType: f.issueType,
      severity: f.severity,
      description: f.description,
      detectedByProcess: ASSIGNMENT_QUALITY_PROCESS,
    }))
  );
}
