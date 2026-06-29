/**
 * Data-quality scoring. Produces a 0-100 completeness + validity score for a
 * master record, plus the list of missing / invalid fields driving the score.
 * The score is persisted on each save (`qualityScore`) and surfaced in the UI.
 */

export interface QualityResult {
  /** 0-100 weighted completeness & validity score. */
  score: number;
  /** Sum of weights earned. */
  earned: number;
  /** Sum of all weights. */
  total: number;
  /** Labels of fields that are empty. */
  missing: string[];
  /** Labels of fields that are present but fail validation. */
  invalid: string[];
}

interface FieldSpec {
  key: string;
  label: string;
  weight: number;
  validate?: (value: string) => boolean;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isCountry = (v: string) => /^[A-Za-z]{2}$/.test(v);
const isCurrency = (v: string) => /^[A-Za-z]{3}$/.test(v);

const CUSTOMER_SPECS: FieldSpec[] = [
  { key: 'customerCode', label: 'Customer code', weight: 3 },
  { key: 'name', label: 'Name', weight: 3 },
  { key: 'segment', label: 'Segment', weight: 2 },
  { key: 'email', label: 'Email', weight: 2, validate: isEmail },
  { key: 'phone', label: 'Phone', weight: 1 },
  { key: 'taxId', label: 'Tax ID', weight: 2 },
  { key: 'website', label: 'Website', weight: 1 },
  { key: 'industry', label: 'Industry', weight: 1 },
  { key: 'addressLine1', label: 'Address', weight: 1 },
  { key: 'city', label: 'City', weight: 1 },
  { key: 'stateProvince', label: 'State / province', weight: 1 },
  { key: 'postalCode', label: 'Postal code', weight: 1 },
  { key: 'countryCode', label: 'Country code', weight: 2, validate: isCountry },
];

const PRODUCT_SPECS: FieldSpec[] = [
  { key: 'sku', label: 'SKU', weight: 3 },
  { key: 'name', label: 'Name', weight: 3 },
  { key: 'description', label: 'Description', weight: 1 },
  { key: 'category', label: 'Category', weight: 2 },
  { key: 'brand', label: 'Brand', weight: 1 },
  { key: 'gtin', label: 'GTIN', weight: 2 },
  { key: 'unitOfMeasure', label: 'Unit of measure', weight: 2 },
  { key: 'listPrice', label: 'List price', weight: 2 },
  { key: 'currency', label: 'Currency', weight: 1, validate: isCurrency },
];

function scoreRecord(
  record: Record<string, unknown>,
  specs: FieldSpec[]
): QualityResult {
  let total = 0;
  let earned = 0;
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const spec of specs) {
    total += spec.weight;
    const raw = record[spec.key];
    const value = typeof raw === 'string' ? raw.trim() : raw;

    if (value == null || value === '') {
      missing.push(spec.label);
      continue;
    }
    if (spec.validate && typeof value === 'string' && !spec.validate(value)) {
      invalid.push(spec.label);
      continue;
    }
    earned += spec.weight;
  }

  const score = total === 0 ? 0 : Math.round((earned / total) * 100);
  return { score, earned, total, missing, invalid };
}

export function scoreCustomer(record: object): QualityResult {
  return scoreRecord(record as Record<string, unknown>, CUSTOMER_SPECS);
}

export function scoreProduct(record: object): QualityResult {
  return scoreRecord(record as Record<string, unknown>, PRODUCT_SPECS);
}

/** Coarse band used for colour coding. */
export function qualityBand(score: number): 'high' | 'medium' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}
