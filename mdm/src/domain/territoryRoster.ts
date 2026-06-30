/**
 * Pure helpers for the territory-role roster model (no Rayfin/network
 * dependency, so fully unit-testable).
 *
 * The roster is the canonical place where role → person is decided: each
 * territory has exactly ONE current member per role per fiscal year. An
 * account's coverage is then *derived* by reading the roster of the territory
 * the account sits in, with per-account {@link AccountEmployeeAssignment} rows
 * acting only as explicit overrides for the minority of exception accounts.
 */

/** Minimal shape needed to reason about one-seat-per-role uniqueness. */
export interface TerritoryRoleScopeRow {
  id: string;
  territoryId: string;
  roleTypeCode: string;
  fiscalYearId: string;
  employeeId: string;
  currentFlag: boolean;
}

/** The natural scope key for "one seat": territory + role + fiscal year. */
export function territoryRoleScopeKey(row: {
  territoryId: string;
  roleTypeCode: string;
  fiscalYearId: string;
}): string {
  return `${row.territoryId}|${row.roleTypeCode}|${row.fiscalYearId}`;
}

/**
 * Groups of current rows that violate "exactly one member per territory seat".
 * Only current (`currentFlag`) rows are considered.
 */
export function findMultipleSeatMembers<T extends TerritoryRoleScopeRow>(
  rows: T[]
): Array<{ key: string; rows: T[] }> {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    if (!r.currentFlag) continue;
    const key = territoryRoleScopeKey(r);
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  return [...groups.entries()]
    .filter(([, rs]) => rs.length > 1)
    .map(([key, rs]) => ({ key, rows: rs }));
}

// ── Account team derivation ────────────────────────────────────────────────

interface TerritoryLink {
  accountId: string;
  territoryId: string;
  fiscalYearId: string;
  currentFlag: boolean;
}

interface RosterSeat {
  id: string;
  territoryId: string;
  roleTypeCode: string;
  fiscalYearId: string;
  employeeId: string;
  currentFlag: boolean;
}

interface OverrideRow {
  id: string;
  accountId: string;
  roleTypeCode: string;
  fiscalYearId: string;
  employeeId: string;
  isPrimary: boolean;
  currentFlag: boolean;
}

export type CoverageSource = 'override' | 'territory';

/** One resolved role seat for an account, with where the person came from. */
export interface DerivedAccountRole {
  roleTypeCode: string;
  employeeId: string;
  source: CoverageSource;
  /** The territory the seat was read from (only for territory-sourced rows). */
  territoryId?: string;
  /** The underlying assignment row id (override or roster seat). */
  assignmentId: string;
}

export interface DeriveAccountTeamArgs {
  accountId: string;
  fiscalYearId: string;
  territoryAssignments: TerritoryLink[];
  territoryRoleAssignments: RosterSeat[];
  employeeAssignments: OverrideRow[];
}

/**
 * The current territories an account sits in for a fiscal year. Normally one
 * (the design rule "most accounts are covered by one territory"); more than one
 * is a data-quality problem but still derivable.
 */
export function currentTerritoryIdsForAccount(
  accountId: string,
  fiscalYearId: string,
  links: TerritoryLink[]
): string[] {
  const ids: string[] = [];
  for (const l of links) {
    if (!l.currentFlag) continue;
    if (l.accountId !== accountId || l.fiscalYearId !== fiscalYearId) continue;
    if (!ids.includes(l.territoryId)) ids.push(l.territoryId);
  }
  return ids;
}

/**
 * Resolve an account's role coverage for a fiscal year. Per role: an explicit
 * account override wins (primary preferred); otherwise the seat from the
 * account's territory roster is used. Roles with neither are simply absent.
 *
 * Returned rows are sorted by role code for stable rendering/testing.
 */
export function deriveAccountTeam(
  args: DeriveAccountTeamArgs
): DerivedAccountRole[] {
  const { accountId, fiscalYearId } = args;
  const territoryIds = currentTerritoryIdsForAccount(
    accountId,
    fiscalYearId,
    args.territoryAssignments
  );
  const territorySet = new Set(territoryIds);

  // Territory roster owner per role (first current seat from one of the
  // account's territories). Primary-ish tie-break is unnecessary — a seat is
  // single by construction; multiple is a separate DQ finding.
  const byRole = new Map<string, DerivedAccountRole>();
  for (const seat of args.territoryRoleAssignments) {
    if (!seat.currentFlag) continue;
    if (seat.fiscalYearId !== fiscalYearId) continue;
    if (!territorySet.has(seat.territoryId)) continue;
    if (byRole.has(seat.roleTypeCode)) continue;
    byRole.set(seat.roleTypeCode, {
      roleTypeCode: seat.roleTypeCode,
      employeeId: seat.employeeId,
      source: 'territory',
      territoryId: seat.territoryId,
      assignmentId: seat.id,
    });
  }

  // Overrides win. Prefer the primary override when several exist for a role.
  const overrideByRole = new Map<string, OverrideRow>();
  for (const o of args.employeeAssignments) {
    if (!o.currentFlag) continue;
    if (o.accountId !== accountId || o.fiscalYearId !== fiscalYearId) continue;
    const existing = overrideByRole.get(o.roleTypeCode);
    if (!existing || (o.isPrimary && !existing.isPrimary)) {
      overrideByRole.set(o.roleTypeCode, o);
    }
  }
  for (const [role, o] of overrideByRole) {
    byRole.set(role, {
      roleTypeCode: role,
      employeeId: o.employeeId,
      source: 'override',
      assignmentId: o.id,
    });
  }

  return [...byRole.values()].sort((a, b) =>
    a.roleTypeCode.localeCompare(b.roleTypeCode)
  );
}

/**
 * Plan an SCD-Type-2 seat swap: end-date the current holder of a territory seat
 * and open a fresh current row for `newEmployeeId`. History is never
 * overwritten, preserving the single-current-row invariant.
 */
export interface SeatReassignmentPlan {
  retireId: string;
  retirePatch: {
    currentFlag: false;
    endDate: Date;
    assignmentStatus: 'retired';
  };
  newRow: {
    territoryId: string;
    employeeId: string;
    fiscalYearId: string;
    roleTypeCode: string;
    startDate: Date;
  };
}

export function planSeatReassignment(
  current: {
    id: string;
    territoryId: string;
    roleTypeCode: string;
    fiscalYearId: string;
  },
  newEmployeeId: string,
  at: Date = new Date()
): SeatReassignmentPlan {
  return {
    retireId: current.id,
    retirePatch: {
      currentFlag: false,
      endDate: at,
      assignmentStatus: 'retired',
    },
    newRow: {
      territoryId: current.territoryId,
      employeeId: newEmployeeId,
      fiscalYearId: current.fiscalYearId,
      roleTypeCode: current.roleTypeCode,
      startDate: at,
    },
  };
}
