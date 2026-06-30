/**
 * First-run seeding. Creates the governed reference code-lists and a small set
 * of demo master records (including intentional duplicates and varied quality)
 * so the dashboard, quality and dedup views are meaningful out of the box.
 *
 * Idempotent: guarded by a localStorage flag and by emptiness checks.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { createCustomer, setCustomerStatus } from '@/services/customers';
import { createProduct, setProductStatus } from '@/services/products';
import type { CustomerInput } from '@/services/customers';
import type { ProductInput } from '@/services/products';
import type { RecordStatus } from '@/domain/types';

const SEED_FLAG = 'mdm.seeded.v1';

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

/** Seed reference + demo data when the backend is empty. Best-effort. */
export async function ensureSeedData(): Promise<boolean> {
  if (localStorage.getItem(SEED_FLAG)) return false;

  try {
    const client = getRayfinClient();
    const [refRows, customerRows, productRows] = await Promise.all([
      client.data.ReferenceValue.findMany(),
      client.data.Customer.findMany(),
      client.data.Product.findMany(),
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

    localStorage.setItem(SEED_FLAG, '1');
    return seeded;
  } catch (err) {
    console.error('Seeding failed', err);
    return false;
  }
}
