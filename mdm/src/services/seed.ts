/**
 * First-run seeding. Creates the governed reference code-lists and a small set
 * of demo master records (including intentional duplicates and varied quality)
 * so the dashboard, quality and dedup views are meaningful out of the box.
 *
 * Idempotent: guarded by a localStorage flag and by emptiness checks.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { createCustomer, setCustomerStatus, listCustomers } from '@/services/customers';
import { createProduct, setProductStatus } from '@/services/products';
import { createFiscalYear, listFiscalYears } from '@/services/fiscalYears';
import { createRoleType } from '@/services/roleTypes';
import { createEmployee, listEmployees } from '@/services/employees';
import { createTerritory } from '@/services/territories';
import { createEmployeeAssignment } from '@/services/assignments';
import type { CustomerInput } from '@/services/customers';
import type { ProductInput } from '@/services/products';
import type { FiscalYearInput } from '@/services/fiscalYears';
import type { RoleTypeInput } from '@/services/roleTypes';
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
  currency: [
    ['USD', 'US Dollar'],
    ['EUR', 'Euro'],
    ['GBP', 'Pound Sterling'],
    ['JPY', 'Japanese Yen'],
  ],
  industry: [
    ['technology', 'Technology'],
    ['manufacturing', 'Manufacturing'],
    ['retail', 'Retail'],
    ['healthcare', 'Healthcare'],
    ['financial_services', 'Financial Services'],
    ['public_sector', 'Public Sector'],
  ],
  product_category: [
    ['hardware', 'Hardware'],
    ['software', 'Software'],
    ['accessories', 'Accessories'],
    ['services', 'Services'],
  ],
  territory_type: [
    ['POD', 'POD'],
    ['SALES_TERRITORY', 'Sales territory'],
    ['SEGMENT', 'Segment'],
    ['INDUSTRY', 'Industry'],
  ],
  role_category: [
    ['sales', 'Sales'],
    ['technical', 'Technical'],
    ['solution_engineer', 'Solution Engineer'],
    ['specialist', 'Specialist'],
    ['management', 'Management'],
  ],
  issue_type: [
    ['MISSING_ACCOUNT_ID', 'Missing account ID'],
    ['DUPLICATE_ACCOUNT', 'Duplicate account candidate'],
    ['UNKNOWN_EMPLOYEE', 'Unknown employee'],
    ['INACTIVE_EMPLOYEE_ASSIGNED', 'Inactive employee assigned'],
    ['INVALID_TERRITORY', 'Invalid territory'],
    ['MULTIPLE_PRIMARY_OWNER', 'Multiple primary owners'],
    ['MISSING_PRIMARY_OWNER', 'Missing primary owner'],
    ['PARENT_CYCLE', 'Parent hierarchy cycle'],
    ['ALIAS_AMBIGUOUS', 'Ambiguous alias'],
    ['UNRESOLVED_PLACEHOLDER', 'Unresolved placeholder assignee'],
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

interface SeedCustomer extends CustomerInput {
  finalStatus: RecordStatus;
}
interface SeedProduct extends ProductInput {
  finalStatus: RecordStatus;
}

const SEED_CUSTOMERS: SeedCustomer[] = [
  {
    customerCode: 'CUST-1001',
    name: 'Contoso Ltd',
    legalName: 'Contoso Limited',
    email: 'accounts@contoso.com',
    phone: '+44 20 7946 0001',
    taxId: 'GB-884217',
    website: 'https://contoso.com',
    segment: 'enterprise',
    industry: 'Technology',
    addressLine1: '1 Contoso Way',
    city: 'London',
    stateProvince: 'London',
    postalCode: 'EC1A 1BB',
    countryCode: 'GB',
    sourceSystem: 'SAP',
    finalStatus: 'approved',
  },
  {
    // Intentional near-duplicate of CUST-1001 (same tax id + email).
    customerCode: 'CUST-1002',
    name: 'Contoso Limited',
    email: 'accounts@contoso.com',
    segment: 'enterprise',
    taxId: 'GB-884217',
    city: 'London',
    countryCode: 'GB',
    sourceSystem: 'Salesforce',
    finalStatus: 'draft',
  },
  {
    customerCode: 'CUST-1010',
    name: 'Fabrikam Inc',
    email: 'hello@fabrikam.com',
    phone: '+1 425 555 0100',
    segment: 'corporate',
    industry: 'Manufacturing',
    addressLine1: '500 Fabrikam Plaza',
    city: 'Redmond',
    stateProvince: 'WA',
    postalCode: '98052',
    countryCode: 'US',
    sourceSystem: 'SAP',
    finalStatus: 'approved',
  },
  {
    customerCode: 'CUST-1020',
    name: 'Adventure Works',
    segment: 'smb',
    city: 'Austin',
    countryCode: 'US',
    sourceSystem: 'Salesforce',
    finalStatus: 'draft',
  },
  {
    customerCode: 'CUST-1030',
    name: 'Northwind Traders',
    legalName: 'Northwind Traders GmbH',
    email: 'kontakt@northwind.example',
    phone: '+49 30 901820',
    taxId: 'DE-552210',
    website: 'https://northwind.example',
    segment: 'corporate',
    industry: 'Retail',
    addressLine1: 'Unter den Linden 5',
    city: 'Berlin',
    postalCode: '10117',
    countryCode: 'DE',
    sourceSystem: 'Dynamics',
    finalStatus: 'pending_approval',
  },
  {
    customerCode: 'CUST-1040',
    name: 'Tailspin Toys',
    segment: 'consumer',
    countryCode: 'US',
    sourceSystem: 'Web',
    finalStatus: 'draft',
  },
];

const SEED_PRODUCTS: SeedProduct[] = [
  {
    sku: 'SKU-9001',
    name: 'Surface Laptop 7',
    description: '13.8" touchscreen laptop, 16GB RAM, 512GB SSD.',
    category: 'Hardware',
    brand: 'Contoso',
    gtin: '0190001234567',
    unitOfMeasure: 'each',
    listPrice: 1299,
    currency: 'USD',
    sourceSystem: 'SAP',
    finalStatus: 'approved',
  },
  {
    // Intentional duplicate of SKU-9001 (same name + brand).
    sku: 'SKU-9002',
    name: 'Surface Laptop 7',
    category: 'Hardware',
    brand: 'Contoso',
    unitOfMeasure: 'each',
    listPrice: 1299,
    currency: 'USD',
    sourceSystem: 'Web',
    finalStatus: 'draft',
  },
  {
    sku: 'SKU-9100',
    name: 'Wireless Ergonomic Mouse',
    description: 'Bluetooth ergonomic mouse.',
    category: 'Accessories',
    brand: 'Fabrikam',
    gtin: '0190009988776',
    unitOfMeasure: 'each',
    listPrice: 29.99,
    currency: 'USD',
    sourceSystem: 'SAP',
    finalStatus: 'approved',
  },
  {
    sku: 'SKU-9200',
    name: 'Cloud Backup Service',
    category: 'Services',
    unitOfMeasure: 'each',
    listPrice: 9.99,
    currency: 'USD',
    sourceSystem: 'Dynamics',
    finalStatus: 'pending_approval',
  },
  {
    sku: 'SKU-9300',
    name: 'USB-C Charging Cable',
    unitOfMeasure: 'each',
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
  for (const { finalStatus, ...input } of SEED_CUSTOMERS) {
    const created = await createCustomer(input);
    if (finalStatus !== 'draft') {
      await setCustomerStatus(created, finalStatus);
    }
  }
  for (const { finalStatus, ...input } of SEED_PRODUCTS) {
    const created = await createProduct(input);
    if (finalStatus !== 'draft') {
      await setProductStatus(created, finalStatus);
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

const ROLE_TYPES: RoleTypeInput[] = [
  { code: 'AE', name: 'Account Executive', category: 'sales', sortOrder: 1 },
  { code: 'DAE', name: 'Digital Account Executive', category: 'sales', sortOrder: 2 },
  { code: 'ATS', name: 'Account Technology Strategist', category: 'technical', sortOrder: 3 },
  { code: 'CSAM', name: 'Customer Success Account Manager', category: 'sales', sortOrder: 4 },
  { code: 'CE', name: 'Cloud Engineer', category: 'technical', sortOrder: 5 },
  { code: 'SE', name: 'Solution Engineer', category: 'solution_engineer', sortOrder: 6 },
  { code: 'COPILOT_SE', name: 'Copilot Solution Engineer', category: 'solution_engineer', sortOrder: 7 },
  { code: 'INFRA_SE', name: 'Infrastructure Solution Engineer', category: 'solution_engineer', sortOrder: 8 },
  { code: 'DATA_AI_SE', name: 'Data & AI Solution Engineer', category: 'solution_engineer', sortOrder: 9 },
  { code: 'APPS_SE', name: 'Business Apps Solution Engineer', category: 'solution_engineer', sortOrder: 10 },
  { code: 'SECURITY_SE', name: 'Security Solution Engineer', category: 'solution_engineer', sortOrder: 11 },
  { code: 'SSP', name: 'Solution Specialist', category: 'specialist', sortOrder: 12 },
  { code: 'GBB', name: 'Global Black Belt', category: 'specialist', sortOrder: 13 },
  { code: 'TECH_ARCH', name: 'Technical Architect', category: 'technical', sortOrder: 14 },
  { code: 'PARTNER_SE', name: 'Partner Solution Engineer', category: 'solution_engineer', sortOrder: 15 },
  { code: 'CSM', name: 'Customer Success Manager', category: 'sales', sortOrder: 16 },
  {
    code: 'MANAGER',
    name: 'People Manager',
    category: 'management',
    isAccountAssignable: false,
    sortOrder: 17,
  },
  {
    code: 'POD_LEAD',
    name: 'POD Lead',
    category: 'management',
    isTerritoryAssignable: true,
    sortOrder: 18,
  },
  { code: 'INDUSTRY_ADVISOR', name: 'Industry Advisor', category: 'specialist', sortOrder: 19 },
  {
    code: 'TERRITORY_OWNER',
    name: 'Territory Owner',
    category: 'sales',
    isTerritoryAssignable: true,
    sortOrder: 20,
  },
];

// Aliases line up with SAMPLE_INGEST_SHEET so preview→commit matches out of the
// box. RJOHNSON is intentionally NOT seeded so the sample yields one unknown
// alias; TBROWN is seeded inactive to exercise the inactive-employee rule.
const SEED_EMPLOYEES: EmployeeInput[] = [
  { alias: 'KTANAKA', displayName: 'Kenji Tanaka', upn: 'ktanaka@contoso.com', email: 'ktanaka@contoso.com', jobTitle: 'Account Executive', roleFamily: 'sales', countryCode: 'JP', personnelNumber: 'P0001' },
  { alias: 'HSATO', displayName: 'Haruki Sato', upn: 'hsato@contoso.com', email: 'hsato@contoso.com', jobTitle: 'Copilot Solution Engineer', roleFamily: 'solution_engineer', countryCode: 'JP', personnelNumber: 'P0002' },
  { alias: 'KMURATA', displayName: 'Kaori Murata', upn: 'kmurata@contoso.com', email: 'kmurata@contoso.com', jobTitle: 'Customer Success Account Manager', roleFamily: 'sales', countryCode: 'JP', personnelNumber: 'P0003' },
  { alias: 'SFUKUSAKO', displayName: 'Sora Fukusako', upn: 'sfukusako@contoso.com', email: 'sfukusako@contoso.com', jobTitle: 'Customer Success Account Manager', roleFamily: 'sales', countryCode: 'JP', personnelNumber: 'P0004' },
  { alias: 'AOKAFOR', displayName: 'Ada Okafor', upn: 'aokafor@contoso.com', email: 'aokafor@contoso.com', jobTitle: 'Solution Engineer', roleFamily: 'solution_engineer', countryCode: 'GB', personnelNumber: 'P0005' },
  { alias: 'LCHEN', displayName: 'Li Chen', upn: 'lchen@contoso.com', email: 'lchen@contoso.com', jobTitle: 'POD Lead', roleFamily: 'management', countryCode: 'US', personnelNumber: 'P0006' },
  { alias: 'MGARCIA', displayName: 'Maria Garcia', upn: 'mgarcia@contoso.com', email: 'mgarcia@contoso.com', jobTitle: 'Global Black Belt', roleFamily: 'specialist', countryCode: 'US', personnelNumber: 'P0007' },
  { alias: 'TBROWN', displayName: 'Taylor Brown', upn: 'tbrown@contoso.com', email: 'tbrown@contoso.com', jobTitle: 'Cloud Engineer', roleFamily: 'technical', countryCode: 'US', personnelNumber: 'P0008', isActive: false },
];

const SEED_TERRITORIES: TerritoryInput[] = [
  { territoryCode: 'JPN.SMECC.RTL.0303', territoryName: 'Japan SME&C Retail 0303', territoryType: 'SALES_TERRITORY', region: 'Japan', countryCode: 'JP' },
  { territoryCode: 'JPN.SMECC.MFG.0101', territoryName: 'Japan SME&C Manufacturing 0101', territoryType: 'SALES_TERRITORY', region: 'Japan', countryCode: 'JP' },
  { territoryCode: 'JPN.SMECC.FSI.0202', territoryName: 'Japan SME&C Financial Services 0202', territoryType: 'SALES_TERRITORY', region: 'Japan', countryCode: 'JP' },
  { territoryCode: 'JPN.SMECC.POD.01', territoryName: 'Japan SME&C POD 01', territoryType: 'POD', region: 'Japan', countryCode: 'JP' },
];

/** account name → role → assignee alias, with a terminal lifecycle status. */
const ASSIGNMENT_SEED: Array<{
  account: string;
  role: string;
  alias: string;
  status: 'draft' | 'submitted' | 'approved' | 'active';
}> = [
  { account: 'Contoso Ltd', role: 'AE', alias: 'KTANAKA', status: 'active' },
  { account: 'Contoso Ltd', role: 'CSAM', alias: 'KMURATA', status: 'approved' },
  { account: 'Contoso Ltd', role: 'COPILOT_SE', alias: 'HSATO', status: 'active' },
  { account: 'Fabrikam Inc', role: 'AE', alias: 'SFUKUSAKO', status: 'active' },
  { account: 'Fabrikam Inc', role: 'CSAM', alias: 'KMURATA', status: 'submitted' },
  { account: 'Northwind Traders', role: 'AE', alias: 'AOKAFOR', status: 'draft' },
  { account: 'Adventure Works', role: 'AE', alias: 'LCHEN', status: 'submitted' },
];

async function seedFiscalYears(): Promise<void> {
  for (const fy of FISCAL_YEARS) await createFiscalYear(fy);
}

async function seedRoleTypes(): Promise<void> {
  for (const role of ROLE_TYPES) await createRoleType(role);
}

async function seedEmployees(): Promise<void> {
  for (const e of SEED_EMPLOYEES) await createEmployee(e);
}

async function seedTerritories(): Promise<void> {
  for (const t of SEED_TERRITORIES) await createTerritory(t);
}

/** Link seeded employees to seeded accounts for the current fiscal year. */
async function seedAssignments(): Promise<void> {
  const [customers, employees, fiscalYears] = await Promise.all([
    listCustomers(),
    listEmployees(),
    listFiscalYears(),
  ]);
  const fy =
    fiscalYears.find((f) => f.isCurrent) ?? fiscalYears[fiscalYears.length - 1];
  if (!fy) return;

  const customerByName = new Map(
    customers.map((c) => [c.name.toLowerCase(), c.id])
  );
  const employeeByAlias = new Map(
    employees
      .filter((e) => e.alias)
      .map((e) => [e.alias!.toLowerCase(), e.id])
  );

  for (const spec of ASSIGNMENT_SEED) {
    const accountId = customerByName.get(spec.account.toLowerCase());
    const employeeId = employeeByAlias.get(spec.alias.toLowerCase());
    if (!accountId || !employeeId) continue;
    await createEmployeeAssignment({
      accountId,
      employeeId,
      fiscalYearId: fy.id,
      roleTypeCode: spec.role,
      isPrimary: true,
      assignmentStatus: spec.status,
      sourceSystem: 'Seed',
    });
  }
}

/** Seed reference + demo data when the backend is empty. Best-effort. */
export async function ensureSeedData(): Promise<boolean> {
  if (localStorage.getItem(SEED_FLAG)) return false;

  try {
    const client = getRayfinClient();
    const [
      refRows,
      customerRows,
      productRows,
      fiscalYearRows,
      roleTypeRows,
      employeeRows,
      territoryRows,
      assignmentRows,
    ] = await Promise.all([
      client.data.ReferenceValue.findMany(),
      client.data.Customer.findMany(),
      client.data.Product.findMany(),
      client.data.FiscalYear.findMany(),
      client.data.RoleType.findMany(),
      client.data.Employee.findMany(),
      client.data.Territory.findMany(),
      client.data.AccountEmployeeAssignment.findMany(),
    ]);

    let seeded = false;
    if (refRows.length === 0) {
      await seedReference();
      seeded = true;
    }
    if (customerRows.length === 0 && productRows.length === 0) {
      await seedMasterData();
      seeded = true;
    }
    if (fiscalYearRows.length === 0) {
      await seedFiscalYears();
      seeded = true;
    }
    if (roleTypeRows.length === 0) {
      await seedRoleTypes();
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
    // Assignments depend on accounts + employees + fiscal years existing.
    if (assignmentRows.length === 0) {
      await seedAssignments();
      seeded = true;
    }

    localStorage.setItem(SEED_FLAG, '1');
    return seeded;
  } catch (err) {
    console.error('Seeding failed', err);
    return false;
  }
}
