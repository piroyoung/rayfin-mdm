/**
 * Role-seat orchestration shared by the roster and role-assignment screens.
 * Owns the create-vs-swap-vs-no-op decision for a seat's member, gates status
 * transitions, and records the audit trail. The SCD-Type-2 swap mechanics live
 * in the repository adapter; these functions only decide and audit.
 */
import { assertTransition } from '@/domain/assignmentWorkflow';
import { territoryRoleScopeKey } from '@/domain/territoryRoster';
import type { AuditLog } from '@/domain/ports/audit-log';
import type { TerritoryRoleAssignmentRepository } from '@/domain/repositories/territory-role-assignment-repository';
import type { AssignmentStatus, TerritoryRoleAssignment } from '@/domain/types';

export interface RoleSeatDeps {
  territoryRoleAssignments: TerritoryRoleAssignmentRepository;
  audit: AuditLog;
}

export interface SeatScope {
  territoryId: string;
  roleTypeCode: string;
  fiscalYearId: string;
}

/**
 * Set (or change) the single member of a territory/role/FY seat against the
 * caller's already-loaded rows: empty seat → create a current row; a different
 * current holder → SCD-Type-2 swap (old row retired, new current row opened);
 * the same person → no-op.
 */
export async function setSeatMember(
  deps: RoleSeatDeps,
  current: TerritoryRoleAssignment[],
  seat: SeatScope,
  newEmployeeId: string
): Promise<TerritoryRoleAssignment> {
  const key = territoryRoleScopeKey(seat);
  const holder = current.find(
    (r) => r.currentFlag && territoryRoleScopeKey(r) === key
  );

  if (!holder) {
    const created = await deps.territoryRoleAssignments.create({
      ...seat,
      employeeId: newEmployeeId,
    });
    await deps.audit.log({
      domain: 'territory_role',
      action: 'create',
      recordId: created.id,
      recordLabel: `${seat.roleTypeCode} seat`,
      summary: `Staffed ${seat.roleTypeCode} seat in territory`,
      details: {
        territoryId: seat.territoryId,
        fiscalYearId: seat.fiscalYearId,
      },
    });
    return created;
  }
  if (holder.employeeId === newEmployeeId) return holder;

  const created = await deps.territoryRoleAssignments.reassignSeat(
    holder,
    newEmployeeId
  );
  await deps.audit.log({
    domain: 'territory_role',
    action: 'status_change',
    recordId: created.id,
    recordLabel: `${seat.roleTypeCode} seat`,
    summary: `Reassigned ${seat.roleTypeCode} seat holder (history preserved)`,
    details: {
      retiredAssignmentId: holder.id,
      previousEmployeeId: holder.employeeId,
      newEmployeeId,
    },
  });
  return created;
}

/** Apply a validated status transition to a seat and record it. */
export async function advanceSeatStatus(
  deps: RoleSeatDeps,
  record: TerritoryRoleAssignment,
  status: AssignmentStatus,
  note?: string
): Promise<TerritoryRoleAssignment> {
  assertTransition(record.assignmentStatus, status);
  const updated = await deps.territoryRoleAssignments.setStatus(record, status);
  await deps.audit.log({
    domain: 'territory_role',
    action:
      status === 'submitted'
        ? 'submit'
        : status === 'approved'
          ? 'approve'
          : 'status_change',
    recordId: record.id,
    recordLabel: `${record.roleTypeCode} seat`,
    summary: `Territory ${record.roleTypeCode} seat → ${status}`,
    details: note,
  });
  return updated;
}

/** Vacate a seat entirely (hard delete of the current row). */
export async function clearSeat(
  deps: RoleSeatDeps,
  record: TerritoryRoleAssignment
): Promise<void> {
  await deps.territoryRoleAssignments.delete(record.id);
  await deps.audit.log({
    domain: 'territory_role',
    action: 'delete',
    recordId: record.id,
    recordLabel: `${record.roleTypeCode} seat`,
    summary: `Vacated ${record.roleTypeCode} seat in territory`,
  });
}
