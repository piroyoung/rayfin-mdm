/**
 * Account-placement orchestration for the territory-placement screens. Gates
 * status transitions and records the audit trail; the SCD end-date / current
 * flag derivation lives in the repository adapter. These functions only decide
 * and audit.
 */
import { assertTransition } from '@/domain/assignmentWorkflow';
import type { AuditLog } from '@/domain/ports/audit-log';
import type {
  TerritoryAccountAssignmentRepository,
  TerritoryAssignmentInput,
} from '@/domain/repositories/territory-account-assignment-repository';
import type {
  AssignmentStatus,
  TerritoryAccountAssignment,
} from '@/domain/types';

export interface PlacementDeps {
  territoryAccountAssignments: TerritoryAccountAssignmentRepository;
  audit: AuditLog;
}

/** Place an account in a territory for a fiscal year and record it. */
export async function createPlacement(
  deps: PlacementDeps,
  input: TerritoryAssignmentInput
): Promise<TerritoryAccountAssignment> {
  const created = await deps.territoryAccountAssignments.create(input);
  await deps.audit.log({
    domain: 'assignment',
    action: 'create',
    recordId: created.id,
    recordLabel: 'territory placement',
    summary: 'Placed account in a territory',
    details: { accountId: input.accountId, territoryId: input.territoryId },
  });
  return created;
}

/** Apply a validated status transition to a placement and record it. */
export async function advancePlacementStatus(
  deps: PlacementDeps,
  record: TerritoryAccountAssignment,
  status: AssignmentStatus,
  note?: string
): Promise<TerritoryAccountAssignment> {
  assertTransition(record.assignmentStatus, status);
  const updated = await deps.territoryAccountAssignments.setStatus(
    record,
    status
  );
  await deps.audit.log({
    domain: 'assignment',
    action:
      status === 'submitted'
        ? 'submit'
        : status === 'approved'
          ? 'approve'
          : 'status_change',
    recordId: record.id,
    recordLabel: 'territory placement',
    summary: `Territory placement → ${status}`,
    details: note,
  });
  return updated;
}

/** Hard-delete a placement row (SCD history rows are kept). */
export async function deletePlacement(
  deps: PlacementDeps,
  record: TerritoryAccountAssignment
): Promise<void> {
  await deps.territoryAccountAssignments.delete(record.id);
  await deps.audit.log({
    domain: 'assignment',
    action: 'delete',
    recordId: record.id,
    recordLabel: 'territory placement',
    summary: 'Removed a territory placement',
  });
}
