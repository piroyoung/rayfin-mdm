/**
 * Role business-key rules. `code` is the system join key (Employee and
 * TerritoryRoleAssignment reference it), so it must stay unique even though
 * users no longer type it. These are pure functions shared by the Rayfin role
 * adapter and the legacy seed service.
 */

/** Slugify a role name into an uppercase business-key stem. */
export function slugifyRoleCode(name: string): string {
  const base = (name ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return base || 'ROLE';
}

/**
 * Build a unique `code` from a role name given the set of codes already taken.
 * Duplicate copies get a numeric suffix.
 */
export function nextUniqueRoleCode(
  name: string,
  taken: Iterable<string>
): string {
  const base = slugifyRoleCode(name);
  const set = taken instanceof Set ? taken : new Set(taken);
  if (!set.has(base)) return base;
  for (let i = 2; i < 10000; i += 1) {
    const candidate = `${base}_${i}`;
    if (!set.has(candidate)) return candidate;
  }
  return `${base}_${Date.now()}`;
}
