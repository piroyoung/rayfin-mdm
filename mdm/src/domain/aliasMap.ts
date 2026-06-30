/**
 * Pure name-matching helpers: resolve a free-text assignee alias from the Excel
 * sheet to an `Employee` surrogate id, and normalize/classify territory codes.
 * No Rayfin/network dependency, so the matching logic is fully unit-testable.
 */

/** Minimal employee shape needed for alias matching. */
export interface EmployeeLike {
  id: string;
  alias?: string | null;
  upn?: string | null;
  email?: string | null;
  displayName: string;
  personnelNumber?: string | null;
}

export type AliasMatchVia =
  | 'alias'
  | 'upn'
  | 'email'
  | 'personnelNumber'
  | 'displayName';

export type AliasResolution =
  | { status: 'matched'; employeeId: string; via: AliasMatchVia }
  | { status: 'ambiguous'; employeeIds: string[] }
  | { status: 'unknown' };

/** Match priority — higher-signal identifiers win over display names. */
const MATCH_ORDER: AliasMatchVia[] = [
  'alias',
  'upn',
  'email',
  'personnelNumber',
  'displayName',
];

export interface AliasIndex {
  alias: Map<string, Set<string>>;
  upn: Map<string, Set<string>>;
  email: Map<string, Set<string>>;
  personnelNumber: Map<string, Set<string>>;
  displayName: Map<string, Set<string>>;
}

function norm(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/** Local part of a UPN/email (`jdoe@contoso.com` → `jdoe`). */
function localPart(value: string | null | undefined): string {
  const n = norm(value);
  const at = n.indexOf('@');
  return at === -1 ? n : n.slice(0, at);
}

function add(map: Map<string, Set<string>>, key: string, id: string): void {
  if (!key) return;
  const set = map.get(key) ?? new Set<string>();
  set.add(id);
  map.set(key, set);
}

/** Build lookup maps for `resolveAlias`. Aliases are indexed under several keys. */
export function buildAliasIndex(employees: EmployeeLike[]): AliasIndex {
  const index: AliasIndex = {
    alias: new Map(),
    upn: new Map(),
    email: new Map(),
    personnelNumber: new Map(),
    displayName: new Map(),
  };
  for (const e of employees) {
    add(index.alias, norm(e.alias), e.id);
    // A bare alias often equals the UPN/email local part, so index those too.
    add(index.upn, localPart(e.upn), e.id);
    add(index.email, localPart(e.email), e.id);
    add(index.personnelNumber, norm(e.personnelNumber), e.id);
    add(index.displayName, norm(e.displayName), e.id);
  }
  return index;
}

/**
 * Resolve a raw alias cell to an employee. Returns the first priority tier that
 * produces a hit: a single hit is `matched`, several hits are `ambiguous`. When
 * no tier matches, the result is `unknown`.
 */
export function resolveAlias(
  index: AliasIndex,
  rawAlias: string
): AliasResolution {
  const key = norm(rawAlias);
  const local = localPart(rawAlias);
  if (!key) return { status: 'unknown' };

  for (const via of MATCH_ORDER) {
    const map = index[via];
    const hits = map.get(key) ?? (local !== key ? map.get(local) : undefined);
    if (!hits || hits.size === 0) continue;
    if (hits.size === 1) {
      return { status: 'matched', employeeId: [...hits][0], via };
    }
    return { status: 'ambiguous', employeeIds: [...hits].sort() };
  }
  return { status: 'unknown' };
}

// ── Territory normalization ─────────────────────────────────────────────────

/** Dotted segments, ≥3 of them: `JPN.SMECC.RTL.0303`. */
const TERRITORY_RE = /^[A-Z0-9]+(?:\.[A-Z0-9]+){2,}$/;

/** Upper-case and strip whitespace from a territory code. */
export function normalizeTerritoryCode(raw: string | null | undefined): string {
  return (raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

export interface TerritoryClassification {
  normalized: string;
  territoryType: 'POD' | 'SALES_TERRITORY';
  valid: boolean;
}

/**
 * Classify a territory code: validate the dotted shape and flag PODs (`territoryType=POD`).
 * Free-text or empty values come back `valid=false` for data-quality reporting.
 */
export function classifyTerritory(
  raw: string | null | undefined
): TerritoryClassification {
  const normalized = normalizeTerritoryCode(raw);
  const isPod = /(^|\.)POD\d*(\.|$)/.test(normalized) || /POD/.test(normalized);
  return {
    normalized,
    territoryType: isPod ? 'POD' : 'SALES_TERRITORY',
    valid: TERRITORY_RE.test(normalized),
  };
}
