/**
 * First-run seeding. Creates the governed reference code-lists and a small set
 * of demo master records (including intentional duplicates and varied quality)
 * so the dashboard, quality and dedup views are meaningful out of the box.
 *
 * Seeding only runs against a local backend (dev). Deployed Fabric backends are
 * never auto-seeded — production data is managed explicitly, not generated.
 *
 * Idempotent: guarded by the local-backend check, a localStorage flag, and by
 * per-entity emptiness checks.
 */
import { getRayfinClient, isLocalBackend } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import {
  createAccount,
  setAccountStatus,
  listAccounts,
  accountName,
} from '@/services/accounts';
import { createFiscalYear, listFiscalYears } from '@/services/fiscalYears';
import { createRole } from '@/services/roles';
import { createEmployee, listEmployees } from '@/services/employees';
import { createTerritory, listTerritories } from '@/services/territories';
import { createTerritoryAssignment } from '@/services/assignments';
import { createTerritoryRoleAssignment } from '@/services/territoryRoleAssignments';
import type { AccountInput } from '@/services/accounts';
import type { FiscalYearInput } from '@/services/fiscalYears';
import type { RoleInput } from '@/services/roles';
import type { EmployeeInput } from '@/services/employees';
import type { TerritoryInput } from '@/services/territories';
import type { RecordStatus } from '@/domain/types';

const SEED_FLAG = 'mdm.seeded.v2';

const REFERENCE_SETS: Record<string, Array<[string, string]>> = {
  segment: [
    ['enterprise', 'Enterprise'],
    ['corporate', 'Corporate'],
    ['smb', 'SMB'],
    ['consumer', 'Consumer'],
    ['public_sector', 'Public sector'],
  ],
  country: [
    ['US', 'United States'],
    ['GB', 'United Kingdom'],
    ['JP', 'Japan'],
    ['DE', 'Germany'],
    ['FR', 'France'],
    ['IN', 'India'],
    ['AU', 'Australia'],
    ['CA', 'Canada'],
  ],
  industry: [
    ['technology', 'Technology'],
    ['manufacturing', 'Manufacturing'],
    ['retail', 'Retail'],
    ['healthcare', 'Healthcare'],
    ['financial_services', 'Financial Services'],
    ['public_sector', 'Public Sector'],
  ],
  territory_type: [
    ['POD', 'POD'],
    ['SALES_TERRITORY', 'Sales territory'],
    ['SEGMENT', 'Segment'],
    ['INDUSTRY', 'Industry'],
  ],
  org_unit: [
    ['SMC', 'SME&C'],
    ['STU', 'Solution Team Unit'],
    ['CSU', 'Customer Success Unit'],
    ['GPS', 'Global Partner Solutions'],
  ],
  solution_area: [
    ['apps_infra', 'Apps & Infrastructure'],
    ['data_ai', 'Data & AI'],
    ['biz_apps', 'Business Applications'],
    ['modern_work', 'Modern Work'],
    ['security', 'Security'],
  ],
  sub_area: [
    ['copilot', 'Copilot'],
    ['azure_infra', 'Azure Infrastructure'],
    ['azure_data', 'Azure Data'],
    ['dynamics', 'Dynamics 365'],
    ['m365', 'Microsoft 365'],
  ],
  issue_type: [
    ['MISSING_ACCOUNT_ID', 'Missing account ID'],
    ['DUPLICATE_ACCOUNT', 'Duplicate account candidate'],
    ['UNKNOWN_EMPLOYEE', 'Unknown employee'],
    ['INACTIVE_EMPLOYEE_ASSIGNED', 'Inactive employee assigned'],
    ['INVALID_TERRITORY', 'Invalid territory'],
    ['PARENT_CYCLE', 'Parent hierarchy cycle'],
    ['ALIAS_AMBIGUOUS', 'Ambiguous alias'],
    ['UNRESOLVED_PLACEHOLDER', 'Unresolved placeholder assignee'],
    ['MULTIPLE_TERRITORY_ROLE_MEMBER', 'Multiple members in one territory role'],
    ['MULTIPLE_TERRITORY_PER_ACCOUNT', 'Account covered by multiple territories'],
    ['ROLE_MISMATCH', 'Assigned role differs from home role'],
  ],
  assignment_status: [
    ['draft', 'Draft'],
    ['submitted', 'Submitted'],
    ['approved', 'Approved'],
    ['active', 'Active'],
    ['retired', 'Retired'],
  ],
  change_flag: [
    ['new', 'New'],
    ['changed', 'Changed'],
    ['unchanged', 'Unchanged'],
    ['removed', 'Removed'],
  ],
  vertical: [
    ['retail', 'Retail'],
    ['manufacturing', 'Manufacturing'],
    ['financial_services', 'Financial Services'],
    ['public_sector', 'Public Sector'],
    ['healthcare', 'Healthcare'],
    ['telco', 'Telco & Media'],
  ],
};

interface SeedAccount extends AccountInput {
  finalStatus: RecordStatus;
}

const SEED_ACCOUNTS: SeedAccount[] = [
  {
    accountNumber: 'ACC-1001',
    nameDisplay: 'Contoso Ltd',
    nameLegal: 'Contoso Limited',
    segmentCode: 'enterprise',
    industryCode: 'technology',
    crmAccountId: 'CRM-CONTOSO',
    msSalesAccountId: 'MS-CONTOSO',
    city: 'London',
    region: 'UK',
    countryCode: 'GB',
    sourceSystem: 'SAP',
    finalStatus: 'approved',
  },
  {
    // Intentional near-duplicate of ACC-1001 (same legal name + country, same CRM id).
    accountNumber: 'ACC-1002',
    nameDisplay: 'Contoso Limited',
    nameLegal: 'Contoso Limited',
    segmentCode: 'enterprise',
    crmAccountId: 'CRM-CONTOSO',
    city: 'London',
    countryCode: 'GB',
    sourceSystem: 'Salesforce',
    finalStatus: 'draft',
  },
  {
    accountNumber: 'ACC-1010',
    nameDisplay: 'Fabrikam Inc',
    nameLegal: 'Fabrikam Incorporated',
    segmentCode: 'corporate',
    industryCode: 'manufacturing',
    city: 'Redmond',
    region: 'Americas',
    countryCode: 'US',
    sourceSystem: 'SAP',
    finalStatus: 'approved',
  },
  {
    accountNumber: 'ACC-1020',
    nameLegal: 'Adventure Works',
    segmentCode: 'smb',
    city: 'Austin',
    countryCode: 'US',
    sourceSystem: 'Salesforce',
    finalStatus: 'draft',
  },
  {
    accountNumber: 'ACC-1030',
    nameDisplay: 'Northwind Traders',
    nameLegal: 'Northwind Traders GmbH',
    segmentCode: 'corporate',
    industryCode: 'retail',
    city: 'Berlin',
    region: 'EMEA',
    countryCode: 'DE',
    sourceSystem: 'Dynamics',
    finalStatus: 'pending_approval',
  },
  {
    accountNumber: 'ACC-1040',
    nameLegal: 'Tailspin Toys',
    segmentCode: 'consumer',
    countryCode: 'US',
    sourceSystem: 'Web',
    finalStatus: 'draft',
  },
];

async function seedReference(): Promise<void> {
  const client = getRayfinClient();
  for (const [setName, items] of Object.entries(REFERENCE_SETS)) {
    await Promise.all(
      items.map(([code, label], index) =>
        client.data.ReferenceValue.create({
          setName,
          code,
          label,
          sortOrder: index,
          isActive: true,
          createdBy: actorId(),
          createdAt: new Date(),
        })
      )
    );
  }
}

async function seedMasterData(): Promise<void> {
  for (const { finalStatus, ...input } of SEED_ACCOUNTS) {
    const created = await createAccount(input);
    if (finalStatus !== 'draft') {
      await setAccountStatus(created, finalStatus);
    }
  }
}

// ── Territory-assignment domain seed (Phase 6) ──────────────────────────────

const FISCAL_YEARS: FiscalYearInput[] = [
  {
    code: 'FY25',
    name: 'Fiscal Year 2025',
    startDate: new Date('2024-07-01'),
    endDate: new Date('2025-06-30'),
    sortOrder: 25,
  },
  {
    code: 'FY26',
    name: 'Fiscal Year 2026',
    startDate: new Date('2025-07-01'),
    endDate: new Date('2026-06-30'),
    sortOrder: 26,
    isCurrent: true,
  },
  {
    code: 'FY27',
    name: 'Fiscal Year 2027',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2027-06-30'),
    sortOrder: 27,
    isPlanningYear: true,
  },
];

const ROLES: RoleInput[] = [
  { code: 'AE', name: 'Account Executive', orgUnit: 'SMC', sortOrder: 1 },
  { code: 'DAE', name: 'Digital Account Executive', orgUnit: 'SMC', sortOrder: 2 },
  { code: 'ATS', name: 'Account Technology Strategist', orgUnit: 'SMC', sortOrder: 3 },
  { code: 'CSAM', name: 'Customer Success Account Manager', orgUnit: 'CSU', sortOrder: 4 },
  { code: 'CE', name: 'Cloud Engineer', orgUnit: 'CSU', solutionArea: 'apps_infra', subArea: 'azure_infra', sortOrder: 5 },
  { code: 'SE', name: 'Solution Engineer', orgUnit: 'STU', sortOrder: 6 },
  { code: 'COPILOT_SE', name: 'Copilot Solution Engineer', orgUnit: 'STU', solutionArea: 'modern_work', subArea: 'copilot', sortOrder: 7 },
  { code: 'INFRA_SE', name: 'Infrastructure Solution Engineer', orgUnit: 'STU', solutionArea: 'apps_infra', subArea: 'azure_infra', sortOrder: 8 },
  { code: 'DATA_AI_SE', name: 'Data & AI Solution Engineer', orgUnit: 'STU', solutionArea: 'data_ai', subArea: 'azure_data', sortOrder: 9 },
  { code: 'APPS_SE', name: 'Business Apps Solution Engineer', orgUnit: 'STU', solutionArea: 'biz_apps', subArea: 'dynamics', sortOrder: 10 },
  { code: 'SECURITY_SE', name: 'Security Solution Engineer', orgUnit: 'STU', solutionArea: 'security', sortOrder: 11 },
  { code: 'SSP', name: 'Solution Specialist', orgUnit: 'STU', sortOrder: 12 },
  { code: 'GBB', name: 'Global Black Belt', orgUnit: 'STU', sortOrder: 13 },
  { code: 'TECH_ARCH', name: 'Technical Architect', orgUnit: 'STU', sortOrder: 14 },
  { code: 'PARTNER_SE', name: 'Partner Solution Engineer', orgUnit: 'GPS', sortOrder: 15 },
  { code: 'CSM', name: 'Customer Success Manager', orgUnit: 'CSU', sortOrder: 16 },
  {
    code: 'MANAGER',
    name: 'People Manager',
    orgUnit: 'SMC',
    isAccountAssignable: false,
    sortOrder: 17,
  },
  {
    code: 'POD_LEAD',
    name: 'POD Lead',
    orgUnit: 'SMC',
    isTerritoryAssignable: true,
    sortOrder: 18,
  },
  { code: 'INDUSTRY_ADVISOR', name: 'Industry Advisor', orgUnit: 'STU', sortOrder: 19 },
  {
    code: 'TERRITORY_OWNER',
    name: 'Territory Owner',
    orgUnit: 'SMC',
    isTerritoryAssignable: true,
    sortOrder: 20,
  },
];

// Aliases line up with SAMPLE_INGEST_SHEET so preview→commit matches out of the
// box. RJOHNSON is intentionally NOT seeded so the sample yields one unknown
// alias; TBROWN is seeded inactive to exercise the inactive-employee rule.
const SEED_EMPLOYEES: EmployeeInput[] = [
  { alias: 'KTANAKA', displayName: 'Kenji Tanaka', upn: 'ktanaka@contoso.com', email: 'ktanaka@contoso.com', jobTitle: 'Account Executive', roleTypeCode: 'AE', countryCode: 'JP', personnelNumber: 'P0001' },
  { alias: 'HSATO', displayName: 'Haruki Sato', upn: 'hsato@contoso.com', email: 'hsato@contoso.com', jobTitle: 'Copilot Solution Engineer', roleTypeCode: 'COPILOT_SE', countryCode: 'JP', personnelNumber: 'P0002' },
  { alias: 'KMURATA', displayName: 'Kaori Murata', upn: 'kmurata@contoso.com', email: 'kmurata@contoso.com', jobTitle: 'Customer Success Account Manager', roleTypeCode: 'CSAM', countryCode: 'JP', personnelNumber: 'P0003' },
  { alias: 'SFUKUSAKO', displayName: 'Sora Fukusako', upn: 'sfukusako@contoso.com', email: 'sfukusako@contoso.com', jobTitle: 'Account Executive', roleTypeCode: 'AE', countryCode: 'JP', personnelNumber: 'P0004' },
  { alias: 'AOKAFOR', displayName: 'Ada Okafor', upn: 'aokafor@contoso.com', email: 'aokafor@contoso.com', jobTitle: 'Account Executive', roleTypeCode: 'AE', countryCode: 'GB', personnelNumber: 'P0005' },
  { alias: 'LCHEN', displayName: 'Li Chen', upn: 'lchen@contoso.com', email: 'lchen@contoso.com', jobTitle: 'POD Lead', roleTypeCode: 'POD_LEAD', countryCode: 'US', personnelNumber: 'P0006' },
  { alias: 'MGARCIA', displayName: 'Maria Garcia', upn: 'mgarcia@contoso.com', email: 'mgarcia@contoso.com', jobTitle: 'Global Black Belt', roleTypeCode: 'GBB', countryCode: 'US', personnelNumber: 'P0007' },
  { alias: 'TBROWN', displayName: 'Taylor Brown', upn: 'tbrown@contoso.com', email: 'tbrown@contoso.com', jobTitle: 'Cloud Engineer', roleTypeCode: 'CE', countryCode: 'US', personnelNumber: 'P0008', isActive: false },
];

const SEED_TERRITORIES: TerritoryInput[] = [
  { territoryCode: 'JPN.SMECC.RTL.0303', territoryName: 'Japan SME&C Retail 0303', territoryType: 'SALES_TERRITORY', region: 'Japan', countryCode: 'JP' },
  { territoryCode: 'JPN.SMECC.MFG.0101', territoryName: 'Japan SME&C Manufacturing 0101', territoryType: 'SALES_TERRITORY', region: 'Japan', countryCode: 'JP' },
  { territoryCode: 'JPN.SMECC.FSI.0202', territoryName: 'Japan SME&C Financial Services 0202', territoryType: 'SALES_TERRITORY', region: 'Japan', countryCode: 'JP' },
  { territoryCode: 'JPN.SMECC.POD.01', territoryName: 'Japan SME&C POD 01', territoryType: 'POD', region: 'Japan', countryCode: 'JP' },
];

/**
 * Canonical roster: each territory staffs ONE member per account-assignable
 * role for the fiscal year. This is the source of truth that flows down to
 * every account the territory covers.
 */
const SEED_TERRITORY_ROLES: Array<{
  territory: string;
  role: string;
  alias: string;
  status: 'draft' | 'submitted' | 'approved' | 'active';
}> = [
  // Retail 0303 — fully staffed and active.
  { territory: 'JPN.SMECC.RTL.0303', role: 'AE', alias: 'KTANAKA', status: 'active' },
  { territory: 'JPN.SMECC.RTL.0303', role: 'CSAM', alias: 'KMURATA', status: 'active' },
  { territory: 'JPN.SMECC.RTL.0303', role: 'COPILOT_SE', alias: 'HSATO', status: 'active' },
  // Manufacturing 0101 — AE active, CSAM still in review.
  { territory: 'JPN.SMECC.MFG.0101', role: 'AE', alias: 'SFUKUSAKO', status: 'active' },
  { territory: 'JPN.SMECC.MFG.0101', role: 'CSAM', alias: 'KMURATA', status: 'submitted' },
  // Financial Services 0202 — being stood up.
  { territory: 'JPN.SMECC.FSI.0202', role: 'AE', alias: 'AOKAFOR', status: 'draft' },
];

/** account name → territory code → placement status (account coverage). */
const SEED_ACCOUNT_TERRITORY: Array<{
  account: string;
  territory: string;
  status: 'draft' | 'submitted' | 'approved' | 'active';
}> = [
  { account: 'Contoso Ltd', territory: 'JPN.SMECC.RTL.0303', status: 'active' },
  { account: 'Fabrikam Inc', territory: 'JPN.SMECC.MFG.0101', status: 'active' },
  { account: 'Northwind Traders', territory: 'JPN.SMECC.FSI.0202', status: 'submitted' },
];

async function seedFiscalYears(): Promise<void> {
  for (const fy of FISCAL_YEARS) await createFiscalYear(fy);
}

async function seedRoles(): Promise<void> {
  for (const role of ROLES) await createRole(role);
}

async function seedEmployees(): Promise<void> {
  for (const e of SEED_EMPLOYEES) await createEmployee(e);
}

async function seedTerritories(): Promise<void> {
  for (const t of SEED_TERRITORIES) await createTerritory(t);
}

/** Staff each territory's roster — one member per role for the current FY. */
async function seedTerritoryRoles(): Promise<void> {
  const [territories, employees, fiscalYears] = await Promise.all([
    listTerritories(),
    listEmployees(),
    listFiscalYears(),
  ]);
  const fy =
    fiscalYears.find((f) => f.isCurrent) ?? fiscalYears[fiscalYears.length - 1];
  if (!fy) return;

  const territoryByCode = new Map(
    territories.map((t) => [t.territoryCode.toLowerCase(), t.id])
  );
  const employeeByAlias = new Map(
    employees
      .filter((e) => e.alias)
      .map((e) => [e.alias!.toLowerCase(), e.id])
  );

  for (const spec of SEED_TERRITORY_ROLES) {
    const territoryId = territoryByCode.get(spec.territory.toLowerCase());
    const employeeId = employeeByAlias.get(spec.alias.toLowerCase());
    if (!territoryId || !employeeId) continue;
    await createTerritoryRoleAssignment({
      territoryId,
      employeeId,
      fiscalYearId: fy.id,
      roleTypeCode: spec.role,
      assignmentStatus: spec.status,
      sourceSystem: 'Seed',
    });
  }
}

/** Place accounts into their covering territory for the current FY. */
async function seedAccountTerritories(): Promise<void> {
  const [accounts, territories, fiscalYears] = await Promise.all([
    listAccounts(),
    listTerritories(),
    listFiscalYears(),
  ]);
  const fy =
    fiscalYears.find((f) => f.isCurrent) ?? fiscalYears[fiscalYears.length - 1];
  if (!fy) return;

  const accountByName = new Map(
    accounts.map((c) => [accountName(c).toLowerCase(), c.id])
  );
  const territoryByCode = new Map(
    territories.map((t) => [t.territoryCode.toLowerCase(), t.id])
  );

  for (const spec of SEED_ACCOUNT_TERRITORY) {
    const accountId = accountByName.get(spec.account.toLowerCase());
    const territoryId = territoryByCode.get(spec.territory.toLowerCase());
    if (!accountId || !territoryId) continue;
    await createTerritoryAssignment({
      accountId,
      territoryId,
      fiscalYearId: fy.id,
      assignmentType: 'PRIMARY',
      assignmentStatus: spec.status,
      sourceSystem: 'Seed',
    });
  }
}

/** Seed reference + demo data when the backend is empty. Best-effort. */
export async function ensureSeedData(): Promise<boolean> {
  // Never auto-seed a deployed Fabric backend — demo data is for local dev only.
  if (!isLocalBackend()) return false;
  if (localStorage.getItem(SEED_FLAG)) return false;

  try {
    const client = getRayfinClient();
    const [
      refRows,
      accountRows,
      fiscalYearRows,
      roleTypeRows,
      employeeRows,
      territoryRows,
      territoryRoleRows,
      territoryAssignmentRows,
    ] = await Promise.all([
      client.data.ReferenceValue.findMany(),
      client.data.Account.findMany(),
      client.data.FiscalYear.findMany(),
      client.data.Role.findMany(),
      client.data.Employee.findMany(),
      client.data.Territory.findMany(),
      client.data.TerritoryRoleAssignment.findMany(),
      client.data.TerritoryAccountAssignment.findMany(),
    ]);

    let seeded = false;
    if (refRows.length === 0) {
      await seedReference();
      seeded = true;
    }
    if (accountRows.length === 0) {
      await seedMasterData();
      seeded = true;
    }
    if (fiscalYearRows.length === 0) {
      await seedFiscalYears();
      seeded = true;
    }
    if (roleTypeRows.length === 0) {
      await seedRoles();
      seeded = true;
    }
    if (employeeRows.length === 0) {
      await seedEmployees();
      seeded = true;
    }
    if (territoryRows.length === 0) {
      await seedTerritories();
      seeded = true;
    }
    // Territory placement + roster depend on territories + employees + FYs.
    if (territoryAssignmentRows.length === 0) {
      await seedAccountTerritories();
      seeded = true;
    }
    if (territoryRoleRows.length === 0) {
      await seedTerritoryRoles();
      seeded = true;
    }

    localStorage.setItem(SEED_FLAG, '1');
    return seeded;
  } catch (err) {
    console.error('Seeding failed', err);
    return false;
  }
}
