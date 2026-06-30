/**
 * Assignment services for the two coverage bridges:
 *   - AccountEmployeeAssignment  (who covers an account, in which role)
 *   - AccountTerritoryAssignment (which territory an account sits in)
 *
 * Both are fiscal-year scoped and carry SCD-Type-2 history. The single-primary
 * rule for employee assignments is enforced with the pure `planPrimaryToggle`
 * helper from `@/domain/assignments`.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import { planPrimaryToggle, type PrimaryScopeRow } from '@/domain/assignments';
import { assertTransition } from '@/domain/assignmentWorkflow';
import { planReassignment, publishedRows } from '@/domain/assignmentViews';
import type {
  AccountEmployeeAssignment,
  AccountTerritoryAssignment,
  AssignmentStatus,
} from '@/domain/types';

// ---------------------------------------------------------------------------
// Account ↔ Employee (role coverage)
// ---------------------------------------------------------------------------

export interface EmployeeAssignmentInput {
  accountId: string;
  employeeId: string;
  fiscalYearId: string;
  roleTypeCode: string;
  territoryId?: string;
  isPrimary?: boolean;
  assignmentStatus?: AssignmentStatus;
  startDate?: Date;
  sourceSystem?: string;
  sourceRecordId?: string;
}

function employeeAssignments() {
  return getRayfinClient().data.AccountEmployeeAssignment;
}

/** Keep in sync with rayfin/data/AccountEmployeeAssignment.ts. */
const EMPLOYEE_ASSIGNMENT_FIELDS = [
  'id',
  'accountId',
  'employeeId',
  'fiscalYearId',
  'territoryId',
  'roleTypeCode',
  'isPrimary',
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

export async function listEmployeeAssignments(): Promise<
  AccountEmployeeAssignment[]
> {
  return [
    ...(await employeeAssignments()
      .select(EMPLOYEE_ASSIGNMENT_FIELDS)
      .execute()),
  ];
}

/** Approved/active current rows only — the downstream-publishable set. */
export async function listPublishedEmployeeAssignments(): Promise<
  AccountEmployeeAssignment[]
> {
  return publishedRows(await listEmployeeAssignments());
}

export function listEmployeeAssignmentsForAccount(
  accountId: string,
  fiscalYearId?: string
): Promise<AccountEmployeeAssignment[]> {
  const where = fiscalYearId
    ? { accountId: { eq: accountId }, fiscalYearId: { eq: fiscalYearId } }
    : { accountId: { eq: accountId } };
  return employeeAssignments()
    .select(EMPLOYEE_ASSIGNMENT_FIELDS)
    .where(where)
    .execute()
    .then((rows) => [...rows]);
}

export async function createEmployeeAssignment(
  input: EmployeeAssignmentInput
): Promise<AccountEmployeeAssignment> {
  const now = new Date();
  const created = await employeeAssignments().create({
    accountId: input.accountId,
    employeeId: input.employeeId,
    fiscalYearId: input.fiscalYearId,
    territoryId: input.territoryId,
    roleTypeCode: input.roleTypeCode,
    isPrimary: input.isPrimary ?? false,
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
    recordLabel: `${input.roleTypeCode} assignment`,
    summary: `Assigned employee to account in role ${input.roleTypeCode}`,
    details: { accountId: input.accountId, fiscalYearId: input.fiscalYearId },
  });
  return created;
}

export async function updateEmployeeAssignment(
  id: string,
  input: EmployeeAssignmentInput
): Promise<AccountEmployeeAssignment> {
  const updated = await employeeAssignments().update(
    { id },
    {
      accountId: input.accountId,
      employeeId: input.employeeId,
      fiscalYearId: input.fiscalYearId,
      territoryId: input.territoryId,
      roleTypeCode: input.roleTypeCode,
      isPrimary: input.isPrimary ?? false,
      updatedBy: actorId(),
      updatedAt: new Date(),
    }
  );
  await logAudit({
    domain: 'assignment',
    action: 'update',
    recordId: id,
    recordLabel: `${input.roleTypeCode} assignment`,
    summary: `Updated ${input.roleTypeCode} assignment`,
  });
  return updated;
}

export async function setEmployeeAssignmentStatus(
  record: AccountEmployeeAssignment,
  status: AssignmentStatus,
  note?: string
): Promise<AccountEmployeeAssignment> {
  assertTransition(record.assignmentStatus, status);
  const updated = await employeeAssignments().update(
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
    recordLabel: `${record.roleTypeCode} assignment`,
    summary: `Assignment ${record.roleTypeCode} → ${status}`,
    details: note,
  });
  return updated;
}

/**
 * SCD-Type-2 owner swap: end-date the current row and open a fresh current row
 * for `newEmployeeId` in the same account/role/FY/territory scope. History is
 * preserved (the old row stays, flagged `currentFlag=false`) so the invariant
 * "exactly one current row per scope" holds.
 */
export async function reassignEmployeeAssignment(
  current: AccountEmployeeAssignment,
  newEmployeeId: string,
  note?: string
): Promise<AccountEmployeeAssignment> {
  if (newEmployeeId === current.employeeId) {
    throw new Error('The new owner is the same as the current owner.');
  }
  const now = new Date();
  const plan = planReassignment(current, newEmployeeId, now);

  await employeeAssignments().update(
    { id: plan.retireId },
    { ...plan.retirePatch, updatedBy: actorId(), updatedAt: now }
  );

  const created = await employeeAssignments().create({
    accountId: plan.newRow.accountId,
    employeeId: plan.newRow.employeeId,
    fiscalYearId: plan.newRow.fiscalYearId,
    territoryId: plan.newRow.territoryId,
    roleTypeCode: plan.newRow.roleTypeCode,
    isPrimary: plan.newRow.isPrimary,
    assignmentStatus: 'draft',
    startDate: plan.newRow.startDate,
    currentFlag: true,
    createdBy: actorId(),
    updatedBy: actorId(),
    createdAt: now,
    updatedAt: now,
  });

  await logAudit({
    domain: 'assignment',
    action: 'status_change',
    recordId: created.id,
    recordLabel: `${current.roleTypeCode} assignment`,
    summary: `Reassigned ${current.roleTypeCode} owner (history preserved)`,
    details: {
      retiredAssignmentId: plan.retireId,
      previousEmployeeId: current.employeeId,
      newEmployeeId,
      note,
    },
  });
  return created;
}

/**
 * Make `targetId` the single primary owner within its (account, role, FY) scope,
 * flipping the minimal set of sibling rows. `scope` is the current set of rows
 * the caller already has (e.g. from the assignment matrix).
 */
export async function setPrimaryEmployeeAssignment<T extends PrimaryScopeRow>(
  scope: T[],
  targetId: string
): Promise<void> {
  const changes = planPrimaryToggle(scope, targetId);
  for (const change of changes) {
    await employeeAssignments().update(
      { id: change.id },
      { isPrimary: change.isPrimary, updatedBy: actorId(), updatedAt: new Date() }
    );
  }
  if (changes.length) {
    await logAudit({
      domain: 'assignment',
      action: 'update',
      recordId: targetId,
      summary: 'Changed the primary owner for an account/role',
      details: { changed: changes.length },
    });
  }
}

export async function deleteEmployeeAssignment(
  record: AccountEmployeeAssignment
): Promise<void> {
  await employeeAssignments().delete({ id: record.id });
  await logAudit({
    domain: 'assignment',
    action: 'delete',
    recordId: record.id,
    recordLabel: `${record.roleTypeCode} assignment`,
    summary: `Removed ${record.roleTypeCode} assignment`,
  });
}

// ---------------------------------------------------------------------------
// Account ↔ Territory (placement)
// ---------------------------------------------------------------------------

export interface TerritoryAssignmentInput {
  accountId: string;
  territoryId: string;
  fiscalYearId: string;
  assignmentType?: string;
  assignmentStatus?: AssignmentStatus;
  startDate?: Date;
  sourceSystem?: string;
  sourceRecordId?: string;
}

function territoryAssignments() {
  return getRayfinClient().data.AccountTerritoryAssignment;
}

/** Keep in sync with rayfin/data/AccountTerritoryAssignment.ts. */
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
  AccountTerritoryAssignment[]
> {
  return [
    ...(await territoryAssignments()
      .select(TERRITORY_ASSIGNMENT_FIELDS)
      .execute()),
  ];
}

export function listTerritoryAssignmentsForAccount(
  accountId: string
): Promise<AccountTerritoryAssignment[]> {
  return territoryAssignments()
    .select(TERRITORY_ASSIGNMENT_FIELDS)
    .where({ accountId: { eq: accountId } })
    .execute()
    .then((rows) => [...rows]);
}

export async function createTerritoryAssignment(
  input: TerritoryAssignmentInput
): Promise<AccountTerritoryAssignment> {
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
  record: AccountTerritoryAssignment,
  status: AssignmentStatus,
  note?: string
): Promise<AccountTerritoryAssignment> {
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
  record: AccountTerritoryAssignment
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
