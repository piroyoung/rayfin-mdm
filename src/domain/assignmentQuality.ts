/**
 * Pure data-quality rule engine for the territory-assignment domain. Given a
 * snapshot of the master + bridge tables it returns the list of issues that
 * should exist — with no Rayfin/network dependency, so it is fully unit-testable
 * and reusable by both the dashboard (counts) and the persistence layer.
 */
import { findMultipleSeatMembers } from './territoryRoster';
import { detectCycles } from './hierarchy';
import { findAccountDuplicates } from './duplicates';
import type {
  TerritoryAccountAssignment,
  TerritoryRoleAssignment,
  Account,
  DataQualityIssue,
  Employee,
  IssueSeverity,
  Territory,
} from './types';

export interface QualitySnapshot {
  accounts: Account[];
  employees: Employee[];
  territories: Territory[];
  territoryAssignments: TerritoryAccountAssignment[];
  territoryRoleAssignments: TerritoryRoleAssignment[];
}

/** A rule finding, shaped to feed `createDataQualityIssue`. */
export interface QualityFinding {
  entityType: string;
  entityId?: string;
  issueType: string;
  severity: IssueSeverity;
  description: string;
}

const PROCESS = 'assignmentQuality';

const norm = (v?: string | null) => (v ?? '').trim().toLowerCase();

/** Stable identity for a finding, so re-runs don't duplicate open issues. */
export function findingKey(f: {
  entityType: string;
  entityId?: string;
  issueType: string;
}): string {
  return `${f.entityType}|${f.entityId ?? ''}|${f.issueType}`;
}

export function evaluateAssignmentQuality(
  snapshot: QualitySnapshot
): QualityFinding[] {
  const {
    accounts,
    employees,
    territories,
    territoryAssignments,
    territoryRoleAssignments,
  } = snapshot;

  const findings: QualityFinding[] = [];
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const territoryById = new Map(territories.map((t) => [t.id, t]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const accountLabel = (id: string) =>
    accountById.get(id)?.nameDisplay ??
    accountById.get(id)?.nameLegal ??
    accountById.get(id)?.accountNumber ??
    id;
  const territoryLabel = (id: string) =>
    territoryById.get(id)?.territoryCode ?? id;

  // ── Account-level: missing external id ──
  for (const a of accounts) {
    if (a.status === 'merged' || a.status === 'archived') continue;
    if (!a.msSalesAccountId && !a.crmAccountId) {
      findings.push({
        entityType: 'account',
        entityId: a.id,
        issueType: 'MISSING_ACCOUNT_ID',
        severity: 'medium',
        description: `Account "${a.nameDisplay ?? a.nameLegal}" has no MSSales or CRM account id.`,
      });
    }
  }

  // ── Account-level: duplicate candidates ──
  for (const group of findAccountDuplicates(accounts)) {
    for (const rec of group.records) {
      findings.push({
        entityType: 'account',
        entityId: rec.id,
        issueType: 'DUPLICATE_ACCOUNT',
        severity: 'high',
        description: `Possible duplicate account (${group.reasons.join(
          ', '
        )}) — ${group.records.length} records in the group.`,
      });
    }
  }

  // ── Territory-placement: invalid territory ──
  for (const t of territoryAssignments) {
    if (!t.currentFlag) continue;
    if (!territoryById.has(t.territoryId)) {
      findings.push({
        entityType: 'assignment',
        entityId: t.id,
        issueType: 'INVALID_TERRITORY',
        severity: 'high',
        description: `Territory placement for "${accountLabel(
          t.accountId
        )}" references a territory that no longer exists.`,
      });
    }
  }

  // ── One-territory rule: an account placed in more than one current territory ──
  const territoriesByAccountFy = new Map<string, Set<string>>();
  for (const t of territoryAssignments) {
    if (!t.currentFlag) continue;
    const key = `${t.accountId}|${t.fiscalYearId}`;
    const set = territoriesByAccountFy.get(key) ?? new Set<string>();
    set.add(t.territoryId);
    territoriesByAccountFy.set(key, set);
  }
  for (const [key, set] of territoriesByAccountFy) {
    if (set.size < 2) continue;
    const accountId = key.split('|')[0];
    findings.push({
      entityType: 'account',
      entityId: accountId,
      issueType: 'MULTIPLE_TERRITORY_PER_ACCOUNT',
      severity: 'medium',
      description: `"${accountLabel(
        accountId
      )}" is placed in ${set.size} territories in the same fiscal year; an account should sit in one.`,
    });
  }

  // ── Territory-role seat rules (employee validity + single seat + role match) ──
  for (const seat of territoryRoleAssignments) {
    if (!seat.currentFlag) continue;
    const emp = employeeById.get(seat.employeeId);
    if (!emp) {
      findings.push({
        entityType: 'territory_role',
        entityId: seat.id,
        issueType: 'UNKNOWN_EMPLOYEE',
        severity: 'high',
        description: `Territory "${territoryLabel(
          seat.territoryId
        )}" ${seat.roleTypeCode} seat references an unknown employee.`,
      });
    } else if (!emp.isActive) {
      findings.push({
        entityType: 'territory_role',
        entityId: seat.id,
        issueType: 'INACTIVE_EMPLOYEE_ASSIGNED',
        severity: 'medium',
        description: `Inactive employee "${emp.displayName}" holds the ${seat.roleTypeCode} seat in territory "${territoryLabel(
          seat.territoryId
        )}".`,
      });
    }
    // The person's home role differs from the role they're staffed as here.
    if (
      emp &&
      emp.roleTypeCode &&
      emp.roleTypeCode !== seat.roleTypeCode
    ) {
      findings.push({
        entityType: 'territory_role',
        entityId: seat.id,
        issueType: 'ROLE_MISMATCH',
        severity: 'low',
        description: `"${emp.displayName}" holds the ${seat.roleTypeCode} seat in territory "${territoryLabel(
          seat.territoryId
        )}" but their home role is ${emp.roleTypeCode}.`,
      });
    }
    if (!territoryById.has(seat.territoryId)) {
      findings.push({
        entityType: 'territory_role',
        entityId: seat.id,
        issueType: 'INVALID_TERRITORY',
        severity: 'high',
        description: `A ${seat.roleTypeCode} seat references a territory that no longer exists.`,
      });
    }
  }

  // Two or more people in the same territory/role/FY seat — breaks "one seat".
  for (const group of findMultipleSeatMembers(territoryRoleAssignments)) {
    const sample = group.rows[0];
    findings.push({
      entityType: 'territory_role',
      entityId: sample.id,
      issueType: 'MULTIPLE_TERRITORY_ROLE_MEMBER',
      severity: 'high',
      description: `Territory "${territoryLabel(sample.territoryId)}" has ${
        group.rows.length
      } members in the ${sample.roleTypeCode} seat; only one is allowed.`,
    });
  }

  // ── Territory hierarchy cycles ──
  const cycleIds = detectCycles(
    territories.map((t) => ({ id: t.id, parentId: t.parentTerritoryId }))
  );
  for (const id of cycleIds) {
    const t = territoryById.get(id);
    findings.push({
      entityType: 'territory',
      entityId: id,
      issueType: 'PARENT_CYCLE',
      severity: 'high',
      description: `Territory "${
        t?.territoryCode ?? id
      }" is part of a parent hierarchy cycle.`,
    });
  }

  // ── Ambiguous employee alias (active employees sharing an alias) ──
  const aliasGroups = new Map<string, Employee[]>();
  for (const e of employees) {
    if (!e.isActive) continue;
    const key = norm(e.alias);
    if (!key) continue;
    const arr = aliasGroups.get(key) ?? [];
    arr.push(e);
    aliasGroups.set(key, arr);
  }
  for (const group of aliasGroups.values()) {
    if (group.length < 2) continue;
    for (const e of group) {
      findings.push({
        entityType: 'employee',
        entityId: e.id,
        issueType: 'ALIAS_AMBIGUOUS',
        severity: 'medium',
        description: `Alias "${e.alias}" is shared by ${group.length} active employees.`,
      });
    }
  }

  return findings;
}

/**
 * Diff the freshly-evaluated findings against the issues already in the table,
 * returning only those that are genuinely new (no open/in-progress issue with
 * the same entity + rule). Resolved/dismissed issues do not suppress a re-raise.
 */
export function newFindings(
  findings: QualityFinding[],
  existing: DataQualityIssue[]
): QualityFinding[] {
  const openKeys = new Set(
    existing
      .filter(
        (i) =>
          i.resolutionStatus === 'open' || i.resolutionStatus === 'in_progress'
      )
      .map((i) =>
        findingKey({
          entityType: i.entityType,
          entityId: i.entityId,
          issueType: i.issueType,
        })
      )
  );
  const seen = new Set<string>();
  const out: QualityFinding[] = [];
  for (const f of findings) {
    const key = findingKey(f);
    if (openKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

export { PROCESS as ASSIGNMENT_QUALITY_PROCESS };
