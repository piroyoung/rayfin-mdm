/**
 * Data-quality scoring. Produces a 0-100 completeness + validity score for a
 * master record, plus the list of missing / invalid fields driving the score.
 * The score is persisted on each save (`qualityScore`) and surfaced in the UI.
 */

import type { BadgeTone } from '@/domain/types';

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

const isCountry = (v: string) => /^[A-Za-z]{2}$/.test(v);

const ACCOUNT_SPECS: FieldSpec[] = [
  { key: 'accountNumber', label: 'Account number', weight: 3 },
  { key: 'nameLegal', label: 'Legal name', weight: 3 },
  { key: 'nameDisplay', label: 'Display name', weight: 1 },
  { key: 'industryCode', label: 'Industry', weight: 2 },
  { key: 'verticalCode', label: 'Vertical', weight: 2 },
  { key: 'segmentCode', label: 'Segment', weight: 2 },
  { key: 'countryCode', label: 'Country code', weight: 2, validate: isCountry },
  { key: 'region', label: 'Region', weight: 1 },
  { key: 'prefecture', label: 'Prefecture', weight: 1 },
  { key: 'city', label: 'City', weight: 1 },
  { key: 'crmAccountId', label: 'CRM account ID', weight: 1 },
  { key: 'msSalesAccountId', label: 'MSSales account ID', weight: 1 },
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

export function scoreAccount(record: object): QualityResult {
  return scoreRecord(record as Record<string, unknown>, ACCOUNT_SPECS);
}

/** Coarse band used for colour coding. */
export function qualityBand(score: number): 'high' | 'medium' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/**
 * Badge tone for a quality score. Keeps the score→colour business rule in the
 * domain so components (e.g. QualityBadge) never re-derive it from band or
 * score literals.
 */
export function qualityTone(score: number): BadgeTone {
  const band = qualityBand(score);
  return band === 'high' ? 'green' : band === 'medium' ? 'amber' : 'red';
}
