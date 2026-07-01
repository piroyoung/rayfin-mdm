/**
 * Excel/CSV ingest service: wires the pure parse → staging → plan pipeline
 * (`@/domain/ingest`, `@/domain/aliasMap`, `@/domain/ingestPlan`) to the MDM
 * data layer.
 *
 *   previewIngest()  – read-only: parse + resolve against current masters and
 *                      return the canonical plan + data-quality issues.
 *   commitIngest()   – idempotent write: upsert accounts, place them in their
 *                      territory, staff territory role seats, register source
 *                      cross-references, and raise any new data-quality issues.
 */
import { createAccount, listAccounts } from '@/services/accounts';
import { listEmployees } from '@/services/employees';
import { listTerritories } from '@/services/territories';
import { listFiscalYears } from '@/services/fiscalYears';
import {
  createTerritoryAssignment,
  listTerritoryAssignments,
} from '@/services/assignments';
import {
  createTerritoryRoleAssignment,
  listTerritoryRoleAssignments,
} from '@/services/territoryRoleAssignments';
import {
  createDataQualityIssues,
  listOpenDataQualityIssues,
} from '@/services/dataQuality';
import { ensureSourceXref } from '@/services/sourceXref';
import { buildAliasIndex, normalizeTerritoryCode } from '@/domain/aliasMap';
import {
  accountKeyOf,
  buildStaging,
  parseDelimited,
  type IngestColumnConfig,
  type StagingResult,
} from '@/domain/ingest';
import { INGEST_PROCESS, planIngest, type IngestPlan } from '@/domain/ingestPlan';
import type { FiscalYear } from '@/domain/types';

export const INGEST_SOURCE_SYSTEM = 'ExcelIngest';

/** Column layout of the demo sample sheet (overridable from the UI). */
export const DEFAULT_INGEST_CONFIG: IngestColumnConfig = {
  accountNameColumn: 'Account',
  msSalesIdColumn: 'MSSalesAccountID',
  crmIdColumn: 'CRMAccountID',
  territoryColumn: 'Territory',
};

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

async function buildContext(staging: StagingResult) {
  const [accounts, employees, territories, fiscalYears] = await Promise.all([
    listAccounts(),
    listEmployees(),
    listTerritories(),
    listFiscalYears(),
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
  text: string,
  config: IngestColumnConfig = DEFAULT_INGEST_CONFIG
): Promise<IngestPreview> {
  const staging = buildStaging(parseDelimited(text), config);
  const { plan, fiscalYear } = await buildContext(staging);
  return { staging, plan, fiscalYear };
}

function accountNumberFor(account: {
  msSalesAccountId?: string;
  name: string;
}): string {
  const base =
    account.msSalesAccountId?.trim() ||
    account.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `ING-${base}`.slice(0, 48);
}

/**
 * Apply a sheet: create missing accounts, draft employee assignments, source
 * cross-references and data-quality issues. Safe to re-run — existing accounts
 * are matched by name, duplicate current assignments are skipped, and issues
 * already open for the same source row are not re-raised.
 */
export async function commitIngest(
  text: string,
  config: IngestColumnConfig = DEFAULT_INGEST_CONFIG
): Promise<IngestSummary> {
  const staging = buildStaging(parseDelimited(text), config);
  const { plan, accounts, territories, fiscalYear } = await buildContext(staging);

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
      const created = await createAccount({
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
    await ensureSourceXref({
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
    summary.issuesRaised = await raiseIngestIssues(plan);
    return summary;
  }

  // 2) Territory placements + role seats — skip duplicates already current.
  const territoryByCode = new Map(
    territories.map((t) => [normalizeTerritoryCode(t.territoryCode), t.id])
  );

  // 2a) Place each account in its territory (account → territory bridge).
  const existingPlacements = await listTerritoryAssignments();
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
    await createTerritoryAssignment({
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
  const existingSeats = await listTerritoryRoleAssignments();
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
    await createTerritoryRoleAssignment({
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
  summary.issuesRaised = await raiseIngestIssues(plan);
  return summary;
}

/** Persist plan issues that are not already open for the same type + source row. */
async function raiseIngestIssues(plan: IngestPlan): Promise<number> {
  if (plan.issues.length === 0) return 0;
  const open = await listOpenDataQualityIssues();
  const openKeys = new Set(
    open.map((i) => `${i.issueType}|${i.sourceRecordId ?? ''}|${i.description ?? ''}`)
  );
  const fresh = plan.issues.filter(
    (i) => !openKeys.has(`${i.issueType}|${i.sourceRecordId}|${i.description}`)
  );
  if (fresh.length === 0) return 0;
  return createDataQualityIssues(
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
