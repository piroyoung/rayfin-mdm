/**
 * Excel/CSV ingest pipeline. Wires the pure parse → staging → plan pipeline
 * (`@/domain/ingest`, `@/domain/aliasMap`, `@/domain/ingestPlan`) to the MDM
 * data layer through injected repository ports and the feature write operations.
 *
 *   previewIngest()  – read-only: parse + resolve against current masters and
 *                      return the canonical plan + data-quality issues.
 *   commitIngest()   – idempotent write: upsert accounts, place them in their
 *                      territory, staff territory role seats, register source
 *                      cross-references, and raise any new data-quality issues.
 */
import { buildAliasIndex, normalizeTerritoryCode } from '@/domain/aliasMap';
import {
  accountKeyOf,
  buildStaging,
  parseDelimited,
  type IngestColumnConfig,
  type StagingResult,
} from '@/domain/ingest';
import {
  INGEST_PROCESS,
  planIngest,
  type IngestPlan,
} from '@/domain/ingestPlan';
import type { AuditLog } from '@/domain/ports/audit-log';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { DataQualityIssueRepository } from '@/domain/repositories/data-quality-issue-repository';
import type { EmployeeRepository } from '@/domain/repositories/employee-repository';
import type { FiscalYearRepository } from '@/domain/repositories/fiscal-year-repository';
import type { SourceXrefRepository } from '@/domain/repositories/source-xref-repository';
import type { TerritoryRepository } from '@/domain/repositories/territory-repository';
import type { TerritoryAccountAssignmentRepository } from '@/domain/repositories/territory-account-assignment-repository';
import type { TerritoryRoleAssignmentRepository } from '@/domain/repositories/territory-role-assignment-repository';
import type { FiscalYear } from '@/domain/types';
import { createAccount } from '@/usecase/accounts/create-account';
import { createPlacement } from '@/usecase/assignments/placement-operations';
import { createSeat } from '@/usecase/assignments/role-seat-operations';
import { createIssues } from '@/usecase/dataquality/quality-issue-operations';

import { ensureSourceXref } from './ensure-source-xref';

export const INGEST_SOURCE_SYSTEM = 'ExcelIngest';

/** Column layout of the demo sample sheet (overridable from the UI). */
export const DEFAULT_INGEST_CONFIG: IngestColumnConfig = {
  accountNameColumn: 'Account',
  msSalesIdColumn: 'MSSalesAccountID',
  crmIdColumn: 'CRMAccountID',
  territoryColumn: 'Territory',
};

/** Every port + write dependency the ingest pipeline needs. */
export interface IngestDeps {
  accounts: AccountRepository;
  employees: EmployeeRepository;
  territories: TerritoryRepository;
  fiscalYears: FiscalYearRepository;
  territoryAccountAssignments: TerritoryAccountAssignmentRepository;
  territoryRoleAssignments: TerritoryRoleAssignmentRepository;
  dataQualityIssues: DataQualityIssueRepository;
  sourceXrefs: SourceXrefRepository;
  audit: AuditLog;
}

export interface IngestPreview {
  staging: StagingResult;
  plan: IngestPlan;
  fiscalYear: FiscalYear | null;
}

export interface IngestSummary {
  accountsCreated: number;
  placementsCreated: number;
  placementsSkipped: number;
  assignmentsCreated: number;
  assignmentsSkipped: number;
  issuesRaised: number;
  xrefsCreated: number;
  fiscalYearCode: string | null;
}

/** Prefer the current FY, then a planning year, then the newest by sort order. */
function resolveIngestFiscalYear(years: FiscalYear[]): FiscalYear | null {
  if (years.length === 0) return null;
  return (
    years.find((y) => y.isCurrent) ??
    years.find((y) => y.isPlanningYear) ??
    years[years.length - 1]
  );
}

async function buildContext(deps: IngestDeps, staging: StagingResult) {
  const [accounts, employees, territories, fiscalYears] = await Promise.all([
    deps.accounts.list(),
    deps.employees.list(),
    deps.territories.list(),
    deps.fiscalYears.list(),
  ]);

  const aliasIndex = buildAliasIndex(employees);
  const knownTerritoryCodes = new Set(
    territories
      .map((t) => normalizeTerritoryCode(t.territoryCode))
      .filter(Boolean)
  );
  const existingAccountKeys = new Set(
    accounts.flatMap((c) =>
      [c.nameLegal, c.nameDisplay]
        .filter((n): n is string => Boolean(n))
        .map((n) => accountKeyOf(n))
    )
  );

  const plan = planIngest(staging, {
    aliasIndex,
    knownTerritoryCodes,
    existingAccountKeys,
    sourceSystem: INGEST_SOURCE_SYSTEM,
  });

  return {
    plan,
    accounts,
    territories,
    fiscalYear: resolveIngestFiscalYear(fiscalYears),
  };
}

/** Parse + resolve a sheet against current masters without writing anything. */
export async function previewIngest(
  deps: IngestDeps,
  text: string,
  config: IngestColumnConfig = DEFAULT_INGEST_CONFIG
): Promise<IngestPreview> {
  const staging = buildStaging(parseDelimited(text), config);
  const { plan, fiscalYear } = await buildContext(deps, staging);
  return { staging, plan, fiscalYear };
}

function accountNumberFor(account: {
  msSalesAccountId?: string;
  name: string;
}): string {
  const base =
    account.msSalesAccountId?.trim() ||
    account.name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  return `ING-${base}`.slice(0, 48);
}

/**
 * Apply a sheet: create missing accounts, draft employee assignments, source
 * cross-references and data-quality issues. Safe to re-run — existing accounts
 * are matched by name, duplicate current assignments are skipped, and issues
 * already open for the same source row are not re-raised.
 */
export async function commitIngest(
  deps: IngestDeps,
  text: string,
  config: IngestColumnConfig = DEFAULT_INGEST_CONFIG
): Promise<IngestSummary> {
  const staging = buildStaging(parseDelimited(text), config);
  const { plan, accounts, territories, fiscalYear } = await buildContext(
    deps,
    staging
  );

  const summary: IngestSummary = {
    accountsCreated: 0,
    placementsCreated: 0,
    placementsSkipped: 0,
    assignmentsCreated: 0,
    assignmentsSkipped: 0,
    issuesRaised: 0,
    xrefsCreated: 0,
    fiscalYearCode: fiscalYear?.code ?? null,
  };

  // 1) Accounts — match existing by normalized name, create the rest.
  const accountByKey = new Map<string, string>();
  for (const c of accounts) {
    for (const n of [c.nameLegal, c.nameDisplay]) {
      if (n) accountByKey.set(accountKeyOf(n), c.id);
    }
  }
  for (const account of staging.accounts) {
    let accountId = accountByKey.get(account.accountKey);
    if (!accountId) {
      const created = await createAccount(deps, {
        accountNumber: accountNumberFor(account),
        nameLegal: account.name,
        msSalesAccountId: account.msSalesAccountId,
        crmAccountId: account.crmAccountId,
        sourceSystem: INGEST_SOURCE_SYSTEM,
      });
      accountId = created.id;
      accountByKey.set(account.accountKey, accountId);
      summary.accountsCreated += 1;
    }
    // Record the originating Excel row (and MSSales id) as a cross-reference.
    await ensureSourceXref(deps, {
      mdmEntityType: 'account',
      mdmEntityId: accountId,
      sourceSystem: INGEST_SOURCE_SYSTEM,
      sourceEntityType: 'account',
      sourceRecordId: account.msSalesAccountId
        ? `mssales:${account.msSalesAccountId}`
        : `row:${account.sourceRow}`,
      sourceRecordName: account.name,
    });
  }
  summary.xrefsCreated = staging.accounts.length;

  if (!fiscalYear) {
    // No fiscal year to scope assignments to — still raise the issues we found.
    summary.issuesRaised = await raiseIngestIssues(deps, plan);
    return summary;
  }

  // 2) Territory placements + role seats — skip duplicates already current.
  const territoryByCode = new Map(
    territories.map((t) => [normalizeTerritoryCode(t.territoryCode), t.id])
  );

  // 2a) Place each account in its territory (account → territory bridge).
  const existingPlacements = await deps.territoryAccountAssignments.list();
  const placementScopes = new Set(
    existingPlacements
      .filter((p) => p.currentFlag)
      .map((p) => `${p.accountId}|${p.territoryId}|${p.fiscalYearId}`)
  );
  for (const account of staging.accounts) {
    const accountId = accountByKey.get(account.accountKey);
    if (!accountId || !account.territoryCode) continue;
    const territoryId = territoryByCode.get(
      normalizeTerritoryCode(account.territoryCode)
    );
    if (!territoryId) {
      summary.placementsSkipped += 1;
      continue;
    }
    const scope = `${accountId}|${territoryId}|${fiscalYear.id}`;
    if (placementScopes.has(scope)) {
      summary.placementsSkipped += 1;
      continue;
    }
    await createPlacement(deps, {
      accountId,
      territoryId,
      fiscalYearId: fiscalYear.id,
      assignmentStatus: 'draft',
      sourceSystem: INGEST_SOURCE_SYSTEM,
      sourceRecordId: `row:${account.sourceRow}`,
    });
    placementScopes.add(scope);
    summary.placementsCreated += 1;
  }

  // 2b) Staff territory role seats from the resolved assignment intents. One
  //     seat per territory/role/FY — the first intent wins; later duplicates
  //     (and intents whose territory does not resolve) are skipped.
  const existingSeats = await deps.territoryRoleAssignments.list();
  const seatScopes = new Set(
    existingSeats
      .filter((s) => s.currentFlag)
      .map((s) => `${s.territoryId}|${s.roleTypeCode}|${s.fiscalYearId}`)
  );
  for (const intent of plan.intents) {
    const territoryId = intent.territoryCode
      ? territoryByCode.get(normalizeTerritoryCode(intent.territoryCode))
      : undefined;
    if (!territoryId) {
      summary.assignmentsSkipped += 1;
      continue;
    }
    const scope = `${territoryId}|${intent.roleTypeCode}|${fiscalYear.id}`;
    if (seatScopes.has(scope)) {
      summary.assignmentsSkipped += 1;
      continue;
    }
    await createSeat(deps, {
      territoryId,
      employeeId: intent.employeeId,
      fiscalYearId: fiscalYear.id,
      roleTypeCode: intent.roleTypeCode,
      assignmentStatus: 'draft',
      sourceSystem: INGEST_SOURCE_SYSTEM,
      sourceRecordId: intent.sourceRecordId,
    });
    seatScopes.add(scope);
    summary.assignmentsCreated += 1;
  }

  // 3) Data-quality issues (deduped against open issues for the same source row).
  summary.issuesRaised = await raiseIngestIssues(deps, plan);
  return summary;
}

/** Persist plan issues that are not already open for the same type + source row. */
async function raiseIngestIssues(
  deps: IngestDeps,
  plan: IngestPlan
): Promise<number> {
  if (plan.issues.length === 0) return 0;
  const all = await deps.dataQualityIssues.list();
  const open = all.filter(
    (i) =>
      i.resolutionStatus === 'open' || i.resolutionStatus === 'in_progress'
  );
  const openKeys = new Set(
    open.map(
      (i) => `${i.issueType}|${i.sourceRecordId ?? ''}|${i.description ?? ''}`
    )
  );
  const fresh = plan.issues.filter(
    (i) => !openKeys.has(`${i.issueType}|${i.sourceRecordId}|${i.description}`)
  );
  if (fresh.length === 0) return 0;
  return createIssues(
    deps,
    fresh.map((i) => ({
      entityType: i.entityType,
      issueType: i.issueType,
      severity: i.severity,
      description: i.description,
      sourceSystem: i.sourceSystem,
      sourceRecordId: i.sourceRecordId,
      detectedByProcess: INGEST_PROCESS,
    }))
  );
}
