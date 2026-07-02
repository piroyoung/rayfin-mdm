/**
 * Legacy territory-placement service — backlog shim.
 *
 * Migrated screens use {@link TerritoryAccountAssignmentRepository} through the
 * DI graph. This file stays for not-yet-migrated consumers (assignment pages,
 * dataQuality / seed / ingest services, and the projection test). It re-exports
 * the canonical input type from the port so there is no drift, and keeps the
 * data functions bound to the bootstrap client until each consumer migrates.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import { assertTransition } from '@/domain/assignmentWorkflow';
import type { TerritoryAssignmentInput } from '@/domain/repositories/territory-account-assignment-repository';
import type {
  TerritoryAccountAssignment,
  AssignmentStatus,
} from '@/domain/types';

export type { TerritoryAssignmentInput } from '@/domain/repositories/territory-account-assignment-repository';

// ---------------------------------------------------------------------------
// Account ↔ Territory (placement)
// ---------------------------------------------------------------------------

function territoryAssignments() {
  return getRayfinClient().data.TerritoryAccountAssignment;
}

/** Keep in sync with rayfin/data/TerritoryAccountAssignment.ts. */
const TERRITORY_ASSIGNMENT_FIELDS = [
  'id',
  'accountId',
  'territoryId',
  'fiscalYearId',
  'assignmentType',
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

export async function listTerritoryAssignments(): Promise<
  TerritoryAccountAssignment[]
> {
  return [
    ...(await territoryAssignments()
      .select(TERRITORY_ASSIGNMENT_FIELDS)
      .execute()),
  ];
}

export function listTerritoryAssignmentsForAccount(
  accountId: string
): Promise<TerritoryAccountAssignment[]> {
  return territoryAssignments()
    .select(TERRITORY_ASSIGNMENT_FIELDS)
    .where({ accountId: { eq: accountId } })
    .execute()
    .then((rows) => [...rows]);
}

export async function createTerritoryAssignment(
  input: TerritoryAssignmentInput
): Promise<TerritoryAccountAssignment> {
  const now = new Date();
  const created = await territoryAssignments().create({
    accountId: input.accountId,
    territoryId: input.territoryId,
    fiscalYearId: input.fiscalYearId,
    assignmentType: input.assignmentType,
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
    domain: 'assignment',
    action: 'create',
    recordId: created.id,
    recordLabel: 'territory placement',
    summary: 'Placed account in a territory',
    details: { accountId: input.accountId, territoryId: input.territoryId },
  });
  return created;
}

export async function setTerritoryAssignmentStatus(
  record: TerritoryAccountAssignment,
  status: AssignmentStatus,
  note?: string
): Promise<TerritoryAccountAssignment> {
  assertTransition(record.assignmentStatus, status);
  const updated = await territoryAssignments().update(
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

export async function deleteTerritoryAssignment(
  record: TerritoryAccountAssignment
): Promise<void> {
  await territoryAssignments().delete({ id: record.id });
  await logAudit({
    domain: 'assignment',
    action: 'delete',
    recordId: record.id,
    recordLabel: 'territory placement',
    summary: 'Removed a territory placement',
  });
}
