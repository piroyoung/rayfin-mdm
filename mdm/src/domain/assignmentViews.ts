/**
 * Pure derived "views" over the assignment bridges — the equivalents of the
 * design's published/golden SQL views, computed on read and never persisted:
 *
 *   - currentRows / publishedRows  → vw_current_account_assignment (+ publish gate)
 *   - accountOwnerMatrix           → vw_account_owner_matrix
 *   - fyAssignmentChanges          → vw_assignment_change_from_previous_fy
 *
 * Plus {@link planReassignment}: the SCD-Type-2 swap that end-dates the prior
 * owner row and opens a fresh current row instead of mutating in place.
 */
import { isPublishableStatus } from './assignmentWorkflow';
import { assignmentScopeKey } from './assignments';
import type { AccountEmployeeAssignment } from './types';

/** Rows that are the live version of their record. */
export function currentRows(
  rows: AccountEmployeeAssignment[]
): AccountEmployeeAssignment[] {
  return rows.filter((r) => r.currentFlag);
}

/** Current rows that are also approved/active — safe to publish downstream. */
export function publishedRows(
  rows: AccountEmployeeAssignment[]
): AccountEmployeeAssignment[] {
  return rows.filter(
    (r) => r.currentFlag && isPublishableStatus(r.assignmentStatus)
  );
}

export interface OwnerMatrixCell {
  accountId: string;
  roleTypeCode: string;
  fiscalYearId: string;
  primary?: AccountEmployeeAssignment;
  members: AccountEmployeeAssignment[];
}

export interface OwnerMatrixOptions {
  /** Restrict to approved/active rows (the published matrix). Default false. */
  publishedOnly?: boolean;
}

/**
 * Account × role coverage grid for current rows, keyed by account/role/FY. The
 * primary owner (if any) is surfaced separately from the full member list.
 */
export function accountOwnerMatrix(
  rows: AccountEmployeeAssignment[],
  options: OwnerMatrixOptions = {}
): OwnerMatrixCell[] {
  const source = options.publishedOnly ? publishedRows(rows) : currentRows(rows);
  const cells = new Map<string, OwnerMatrixCell>();
  for (const r of source) {
    const key = assignmentScopeKey(r);
    const cell =
      cells.get(key) ??
      ({
        accountId: r.accountId,
        roleTypeCode: r.roleTypeCode,
        fiscalYearId: r.fiscalYearId,
        members: [],
      } as OwnerMatrixCell);
    cell.members.push(r);
    if (r.isPrimary) cell.primary = r;
    cells.set(key, cell);
  }
  return [...cells.values()];
}

export interface FyAssignmentChange {
  accountId: string;
  roleTypeCode: string;
  previousEmployeeId?: string;
  currentEmployeeId?: string;
  /** True when the primary owner differs between the two fiscal years. */
  changed: boolean;
}

/** Pick the primary (else first) published owner per account/role. */
function primaryOwnerByScope(
  rows: AccountEmployeeAssignment[]
): Map<string, AccountEmployeeAssignment> {
  const out = new Map<string, AccountEmployeeAssignment>();
  for (const r of publishedRows(rows)) {
    const key = `${r.accountId}|${r.roleTypeCode}`;
    const existing = out.get(key);
    if (!existing || (r.isPrimary && !existing.isPrimary)) out.set(key, r);
  }
  return out;
}

/**
 * Derive the FY-over-FY owner delta (the design's `AE_Change` column). Compares
 * the published primary owner of each account/role across two fiscal-year row
 * sets. `previous` and `current` must already be scoped to their fiscal years.
 */
export function fyAssignmentChanges(
  previous: AccountEmployeeAssignment[],
  current: AccountEmployeeAssignment[]
): FyAssignmentChange[] {
  const prev = primaryOwnerByScope(previous);
  const cur = primaryOwnerByScope(current);
  const keys = new Set<string>([...prev.keys(), ...cur.keys()]);
  const changes: FyAssignmentChange[] = [];
  for (const key of keys) {
    const [accountId, roleTypeCode] = key.split('|');
    const previousEmployeeId = prev.get(key)?.employeeId;
    const currentEmployeeId = cur.get(key)?.employeeId;
    changes.push({
      accountId,
      roleTypeCode,
      previousEmployeeId,
      currentEmployeeId,
      changed: previousEmployeeId !== currentEmployeeId,
    });
  }
  return changes;
}

export interface ReassignmentPlan {
  /** The prior owner row to end-date (currentFlag → false). */
  retireId: string;
  retirePatch: {
    currentFlag: false;
    endDate: Date;
    assignmentStatus: 'retired';
  };
  /** Fields for the fresh current row covering the new owner. */
  newRow: {
    accountId: string;
    employeeId: string;
    fiscalYearId: string;
    roleTypeCode: string;
    territoryId?: string;
    isPrimary: boolean;
    startDate: Date;
  };
}

/**
 * Plan an SCD-Type-2 owner swap: the existing current row is end-dated and a new
 * current row is opened for `newEmployeeId`, preserving the same account / role /
 * FY / territory / primary flag. History is never overwritten.
 */
export function planReassignment(
  current: AccountEmployeeAssignment,
  newEmployeeId: string,
  at: Date = new Date()
): ReassignmentPlan {
  return {
    retireId: current.id,
    retirePatch: {
      currentFlag: false,
      endDate: at,
      assignmentStatus: 'retired',
    },
    newRow: {
      accountId: current.accountId,
      employeeId: newEmployeeId,
      fiscalYearId: current.fiscalYearId,
      roleTypeCode: current.roleTypeCode,
      territoryId: current.territoryId,
      isPrimary: current.isPrimary,
      startDate: at,
    },
  };
}

/**
 * Invariant check used by tests and callers: within every account/role/FY scope
 * at most one row may carry `currentFlag`. Returns the offending scope keys.
 */
export function scopesWithMultipleCurrent(
  rows: AccountEmployeeAssignment[]
): string[] {
  const counts = new Map<string, number>();
  for (const r of currentRows(rows)) {
    const key = assignmentScopeKey(r);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}
