/**
 * Legacy territory-role roster service — backlog shim.
 *
 * Migrated screens use {@link TerritoryRoleAssignmentRepository} through the DI
 * graph. This file stays for not-yet-migrated consumers (roster / role-seat /
 * stewardship pages, dataQuality / seed / ingest services, and the projection
 * test). It re-exports the canonical input type from the port so there is no
 * drift, and keeps the data functions bound to the bootstrap client until each
 * consumer migrates.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import { assertTransition } from '@/domain/assignmentWorkflow';
import {
  planSeatReassignment,
  territoryRoleScopeKey,
} from '@/domain/territoryRoster';
import type { TerritoryRoleAssignmentInput } from '@/domain/repositories/territory-role-assignment-repository';
import type {
  TerritoryRoleAssignment,
  AssignmentStatus,
} from '@/domain/types';

export type { TerritoryRoleAssignmentInput } from '@/domain/repositories/territory-role-assignment-repository';

function seats() {
  return getRayfinClient().data.TerritoryRoleAssignment;
}

/** Keep in sync with rayfin/data/TerritoryRoleAssignment.ts. */
const TERRITORY_ROLE_FIELDS = [
  'id',
  'territoryId',
  'employeeId',
  'fiscalYearId',
  'roleTypeCode',
  'assignmentStatus',
  'startDate',
  'endDate',
  'currentFlag',
  'sourceSystem',
  'sourceRecordId',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
] as const;

export async function listTerritoryRoleAssignments(): Promise<
  TerritoryRoleAssignment[]
> {
  return [...(await seats().select(TERRITORY_ROLE_FIELDS).execute())];
}

export function listTerritoryRoleAssignmentsForTerritory(
  territoryId: string,
  fiscalYearId?: string
): Promise<TerritoryRoleAssignment[]> {
  const where = fiscalYearId
    ? { territoryId: { eq: territoryId }, fiscalYearId: { eq: fiscalYearId } }
    : { territoryId: { eq: territoryId } };
  return seats()
    .select(TERRITORY_ROLE_FIELDS)
    .where(where)
    .execute()
    .then((rows) => [...rows]);
}

export async function createTerritoryRoleAssignment(
  input: TerritoryRoleAssignmentInput
): Promise<TerritoryRoleAssignment> {
  const now = new Date();
  const created = await seats().create({
    territoryId: input.territoryId,
    employeeId: input.employeeId,
    fiscalYearId: input.fiscalYearId,
    roleTypeCode: input.roleTypeCode,
    assignmentStatus: input.assignmentStatus ?? 'draft',
    startDate: input.startDate ?? now,
    currentFlag: true,
    sourceSystem: input.sourceSystem,
    sourceRecordId: input.sourceRecordId,
    createdBy: actorId(),
    updatedBy: actorId(),
    createdAt: now,
    updatedAt: now,
  });
  await logAudit({
    domain: 'territory_role',
    action: 'create',
    recordId: created.id,
    recordLabel: `${input.roleTypeCode} seat`,
    summary: `Staffed ${input.roleTypeCode} seat in territory`,
    details: { territoryId: input.territoryId, fiscalYearId: input.fiscalYearId },
  });
  return created;
}

/**
 * Set (or change) the single member of a territory/role/FY seat. If the seat is
 * empty a new current row is created; if it already has a different current
 * holder it is SCD-Type-2 swapped (old row retired, new current row opened);
 * if the same person already holds it, nothing happens.
 *
 * `current` is the caller's already-loaded set of rows for the territory (e.g.
 * from the roster grid) — used to find the existing holder of the seat.
 */
export async function setSeatMember(
  current: TerritoryRoleAssignment[],
  seat: {
    territoryId: string;
    roleTypeCode: string;
    fiscalYearId: string;
  },
  newEmployeeId: string
): Promise<TerritoryRoleAssignment> {
  const key = territoryRoleScopeKey(seat);
  const holder = current.find(
    (r) => r.currentFlag && territoryRoleScopeKey(r) === key
  );

  if (!holder) {
    return createTerritoryRoleAssignment({ ...seat, employeeId: newEmployeeId });
  }
  if (holder.employeeId === newEmployeeId) return holder;

  const now = new Date();
  const plan = planSeatReassignment(holder, newEmployeeId, now);
  await seats().update(
    { id: plan.retireId },
    { ...plan.retirePatch, updatedBy: actorId(), updatedAt: now }
  );
  const created = await seats().create({
    territoryId: plan.newRow.territoryId,
    employeeId: plan.newRow.employeeId,
    fiscalYearId: plan.newRow.fiscalYearId,
    roleTypeCode: plan.newRow.roleTypeCode,
    assignmentStatus: 'draft',
    startDate: plan.newRow.startDate,
    currentFlag: true,
    createdBy: actorId(),
    updatedBy: actorId(),
    createdAt: now,
    updatedAt: now,
  });
  await logAudit({
    domain: 'territory_role',
    action: 'status_change',
    recordId: created.id,
    recordLabel: `${seat.roleTypeCode} seat`,
    summary: `Reassigned ${seat.roleTypeCode} seat holder (history preserved)`,
    details: {
      retiredAssignmentId: plan.retireId,
      previousEmployeeId: holder.employeeId,
      newEmployeeId,
    },
  });
  return created;
}

export async function setTerritoryRoleStatus(
  record: TerritoryRoleAssignment,
  status: AssignmentStatus,
  note?: string
): Promise<TerritoryRoleAssignment> {
  assertTransition(record.assignmentStatus, status);
  const updated = await seats().update(
    { id: record.id },
    {
      assignmentStatus: status,
      endDate: status === 'retired' ? new Date() : record.endDate,
      currentFlag: status !== 'retired',
      updatedBy: actorId(),
      updatedAt: new Date(),
    }
  );
  await logAudit({
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

export async function clearSeat(
  record: TerritoryRoleAssignment
): Promise<void> {
  await seats().delete({ id: record.id });
  await logAudit({
    domain: 'territory_role',
    action: 'delete',
    recordId: record.id,
    recordLabel: `${record.roleTypeCode} seat`,
    summary: `Vacated ${record.roleTypeCode} seat in territory`,
  });
}
