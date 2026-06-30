/**
 * Excel/CSV ingest service: wires the pure parse → staging → plan pipeline
 * (`@/domain/ingest`, `@/domain/aliasMap`, `@/domain/ingestPlan`) to the MDM
 * data layer.
 *
 *   previewIngest()  – read-only: parse + resolve against current masters and
 *                      return the canonical plan + data-quality issues.
 *   commitIngest()   – idempotent write: upsert accounts, create draft employee
 *                      assignments, register source cross-references, and raise
 *                      any new data-quality issues.
 */
import { createCustomer, listCustomers } from '@/services/customers';
import { listEmployees } from '@/services/employees';
import { listTerritories } from '@/services/territories';
import { listFiscalYears } from '@/services/fiscalYears';
import {
  createEmployeeAssignment,
  listEmployeeAssignments,
} from '@/services/assignments';
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
  const [customers, employees, territories, fiscalYears] = await Promise.all([
    listCustomers(),
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
  const existingAccountKeys = new Set(customers.map((c) => accountKeyOf(c.name)));

  const plan = planIngest(staging, {
    aliasIndex,
    knownTerritoryCodes,
    existingAccountKeys,
    sourceSystem: INGEST_SOURCE_SYSTEM,
  });

  return {
    plan,
    customers,
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

function customerCodeFor(account: {
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
  const { plan, customers, territories, fiscalYear } = await buildContext(staging);

  const summary: IngestSummary = {
    accountsCreated: 0,
    assignmentsCreated: 0,
    assignmentsSkipped: 0,
    issuesRaised: 0,
    xrefsCreated: 0,
    fiscalYearCode: fiscalYear?.code ?? null,
  };

  // 1) Accounts — match existing by normalized name, create the rest.
  const customerByKey = new Map(customers.map((c) => [accountKeyOf(c.name), c.id]));
  for (const account of staging.accounts) {
    let customerId = customerByKey.get(account.accountKey);
    if (!customerId) {
      const created = await createCustomer({
        customerCode: customerCodeFor(account),
        name: account.name,
        segment: 'corporate',
        msSalesAccountId: account.msSalesAccountId,
        crmAccountId: account.crmAccountId,
        sourceSystem: INGEST_SOURCE_SYSTEM,
      });
      customerId = created.id;
      customerByKey.set(account.accountKey, customerId);
      summary.accountsCreated += 1;
    }
    // Record the originating Excel row (and MSSales id) as a cross-reference.
    await ensureSourceXref({
      mdmEntityType: 'customer',
      mdmEntityId: customerId,
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

  // 2) Assignments — skip duplicates of an existing current row in the same scope.
  const territoryByCode = new Map(
    territories.map((t) => [normalizeTerritoryCode(t.territoryCode), t.id])
  );
  const existing = await listEmployeeAssignments();
  const existingScopes = new Set(
    existing
      .filter((a) => a.currentFlag)
      .map((a) => `${a.accountId}|${a.employeeId}|${a.roleTypeCode}|${a.fiscalYearId}`)
  );

  for (const intent of plan.intents) {
    const accountId = customerByKey.get(intent.accountKey);
    if (!accountId) {
      summary.assignmentsSkipped += 1;
      continue;
    }
    const scope = `${accountId}|${intent.employeeId}|${intent.roleTypeCode}|${fiscalYear.id}`;
    if (existingScopes.has(scope)) {
      summary.assignmentsSkipped += 1;
      continue;
    }
    await createEmployeeAssignment({
      accountId,
      employeeId: intent.employeeId,
      fiscalYearId: fiscalYear.id,
      roleTypeCode: intent.roleTypeCode,
      territoryId: intent.territoryCode
        ? territoryByCode.get(normalizeTerritoryCode(intent.territoryCode))
        : undefined,
      isPrimary: intent.isPrimary,
      assignmentStatus: 'draft',
      sourceSystem: INGEST_SOURCE_SYSTEM,
      sourceRecordId: intent.sourceRecordId,
    });
    existingScopes.add(scope);
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
