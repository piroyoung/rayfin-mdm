/**
 * Pure assignment helpers (no Rayfin/network dependency, so unit-testable).
 *
 * Covers the two normalization rules from the schema design: splitting
 * multi-assignee Excel cells into individual rows, and keeping a single
 * `isPrimary` owner per (account, role, fiscal year).
 */

/** Tokens that mean "no real person yet" — placeholders, not employees. */
export const PLACEHOLDER_NAME_TOKENS: ReadonlySet<string> = new Set([
  'tbh',
  'tba',
  'tbd',
  'vacant',
  'open',
  'n/a',
  'na',
  'none',
  'move out to other segment',
]);

export function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name) return true;
  return PLACEHOLDER_NAME_TOKENS.has(name.trim().toLowerCase());
}

// Names are separated by comma / semicolon / newline. Slash is intentionally
// NOT a separator so tokens like "n/a" survive intact.
const SPLIT_RE = /[,;\n]+/;

/**
 * Split a single Excel cell that may hold several assignees
 * (`"KMURATA, SFUKUSAKO"`) into trimmed, de-duplicated names.
 */
export function splitMultiValueCell(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(SPLIT_RE)) {
    const name = part.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Minimal shape needed to reason about primary-owner uniqueness. */
export interface PrimaryScopeRow {
  id: string;
  accountId: string;
  roleTypeCode: string;
  fiscalYearId: string;
  isPrimary: boolean;
  currentFlag: boolean;
}

/** The natural scope key for "one primary owner": account + role + fiscal year. */
export function assignmentScopeKey(row: {
  accountId: string;
  roleTypeCode: string;
  fiscalYearId: string;
}): string {
  return `${row.accountId}|${row.roleTypeCode}|${row.fiscalYearId}`;
}

/**
 * Groups of current rows that violate "at most one primary per scope".
 * Only current (`currentFlag`) primary rows are considered.
 */
export function findMultiplePrimaryGroups<T extends PrimaryScopeRow>(
  rows: T[]
): Array<{ key: string; rows: T[] }> {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    if (!r.currentFlag || !r.isPrimary) continue;
    const key = assignmentScopeKey(r);
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  return [...groups.entries()]
    .filter(([, rs]) => rs.length > 1)
    .map(([key, rs]) => ({ key, rows: rs }));
}

/**
 * Compute the minimal `isPrimary` changes needed so that, within the scope of
 * `targetId`, exactly that current row is primary and its current siblings are
 * not. Returns only rows whose flag actually changes.
 */
export function planPrimaryToggle<T extends PrimaryScopeRow>(
  rows: T[],
  targetId: string
): Array<{ id: string; isPrimary: boolean }> {
  const target = rows.find((r) => r.id === targetId);
  if (!target) return [];
  const scope = assignmentScopeKey(target);
  const changes: Array<{ id: string; isPrimary: boolean }> = [];
  for (const r of rows) {
    if (!r.currentFlag || assignmentScopeKey(r) !== scope) continue;
    const shouldBePrimary = r.id === targetId;
    if (r.isPrimary !== shouldBePrimary) {
      changes.push({ id: r.id, isPrimary: shouldBePrimary });
    }
  }
  return changes;
}
