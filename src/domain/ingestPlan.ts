/**
 * Pure normalization/planning step for the ingest pipeline. Takes the staging
 * output from `@/domain/ingest` plus a resolution context (alias index, known
 * territories, existing accounts) and produces:
 *   - the canonical accounts to create,
 *   - the employee-assignment intents to write, and
 *   - the data-quality issues to raise (unknown/ambiguous alias, invalid
 *     territory, unresolved placeholder).
 *
 * No Rayfin/network dependency — this is the unit-tested core of Phase 6.
 */
import { classifyTerritory, resolveAlias, type AliasIndex } from '@/domain/aliasMap';
import { accountKeyOf, type StagingResult } from '@/domain/ingest';
import type { IssueSeverity } from '@/domain/types';

/** Issue codes raised by the ingest plan (see ISSUE_TYPE_META in types.ts). */
export const INGEST_PROCESS = 'excel_ingest';

export interface IngestIssue {
  entityType: string;
  issueType: string;
  severity: IssueSeverity;
  description: string;
  sourceSystem: string;
  sourceRecordId: string;
}

export interface AssignmentIntent {
  accountKey: string;
  accountName: string;
  roleTypeCode: string;
  employeeId: string;
  alias: string;
  isPrimary: boolean;
  territoryCode?: string;
  sourceRow: number;
  sourceRecordId: string;
}

export interface IngestContext {
  aliasIndex: AliasIndex;
  /**
   * Normalized territory codes known to the master. When empty, validity falls
   * back to shape-only checking via `classifyTerritory`.
   */
  knownTerritoryCodes?: Set<string>;
  /** Normalized account keys (`accountKeyOf(name)`) already in the master. */
  existingAccountKeys?: Set<string>;
  sourceSystem?: string;
}

export interface IngestStats {
  accounts: number;
  newAccounts: number;
  assignees: number;
  matched: number;
  unknown: number;
  ambiguous: number;
  placeholders: number;
  invalidTerritories: number;
}

export interface IngestPlan {
  newAccountKeys: string[];
  intents: AssignmentIntent[];
  issues: IngestIssue[];
  stats: IngestStats;
}

function srcId(sourceRow: number): string {
  return `row:${sourceRow}`;
}

/** Build the canonical plan (accounts, assignment intents, DQ issues) from staging. */
export function planIngest(
  staging: StagingResult,
  ctx: IngestContext
): IngestPlan {
  const sourceSystem = ctx.sourceSystem ?? 'ExcelIngest';
  const existing = ctx.existingAccountKeys ?? new Set<string>();
  const known = ctx.knownTerritoryCodes;

  const intents: AssignmentIntent[] = [];
  const issues: IngestIssue[] = [];
  const newAccountKeys: string[] = [];

  const stats: IngestStats = {
    accounts: staging.accounts.length,
    newAccounts: 0,
    assignees: staging.assignments.length,
    matched: 0,
    unknown: 0,
    ambiguous: 0,
    placeholders: 0,
    invalidTerritories: 0,
  };

  // Accounts: new-vs-existing + territory validity (one issue per account).
  for (const account of staging.accounts) {
    if (!existing.has(account.accountKey)) {
      newAccountKeys.push(account.accountKey);
      stats.newAccounts += 1;
    }
    if (account.territoryCode) {
      const klass = classifyTerritory(account.territoryCode);
      const inMaster = known ? known.has(klass.normalized) : true;
      if (!klass.valid || !inMaster) {
        stats.invalidTerritories += 1;
        issues.push({
          entityType: 'territory',
          issueType: 'INVALID_TERRITORY',
          severity: 'medium',
          description: `Account "${account.name}" references territory "${account.territoryCode}" which is ${
            klass.valid ? 'not in the territory master' : 'not a valid territory code'
          }.`,
          sourceSystem,
          sourceRecordId: srcId(account.sourceRow),
        });
      }
    }
  }

  // Assignments: placeholder → issue+skip; otherwise resolve the alias.
  for (const a of staging.assignments) {
    if (a.isPlaceholder) {
      stats.placeholders += 1;
      issues.push({
        entityType: 'assignment',
        issueType: 'UNRESOLVED_PLACEHOLDER',
        severity: 'low',
        description: `Placeholder "${a.alias}" in ${a.roleTypeCode} for account "${a.accountName}" — no employee assigned.`,
        sourceSystem,
        sourceRecordId: srcId(a.sourceRow),
      });
      continue;
    }

    const match = resolveAlias(ctx.aliasIndex, a.alias);
    if (match.status === 'matched') {
      stats.matched += 1;
      intents.push({
        accountKey: a.accountKey,
        accountName: a.accountName,
        roleTypeCode: a.roleTypeCode,
        employeeId: match.employeeId,
        alias: a.alias,
        isPrimary: a.isPrimary,
        territoryCode: a.territoryCode,
        sourceRow: a.sourceRow,
        sourceRecordId: srcId(a.sourceRow),
      });
    } else if (match.status === 'ambiguous') {
      stats.ambiguous += 1;
      issues.push({
        entityType: 'assignment',
        issueType: 'ALIAS_AMBIGUOUS',
        severity: 'medium',
        description: `Alias "${a.alias}" (${a.roleTypeCode}, account "${a.accountName}") matches ${match.employeeIds.length} employees.`,
        sourceSystem,
        sourceRecordId: srcId(a.sourceRow),
      });
    } else {
      stats.unknown += 1;
      issues.push({
        entityType: 'assignment',
        issueType: 'UNKNOWN_EMPLOYEE',
        severity: 'medium',
        description: `Alias "${a.alias}" (${a.roleTypeCode}, account "${a.accountName}") did not match any employee.`,
        sourceSystem,
        sourceRecordId: srcId(a.sourceRow),
      });
    }
  }

  return { newAccountKeys, intents, issues, stats };
}

/** Convenience re-export so callers can normalize keys consistently. */
export { accountKeyOf };
