/** Pure derivations for the Territories screen: free-text search. */
import type { Territory } from '@/domain/types';

/** Filter territories by code / name / type / region. */
export function filterTerritories(
  territories: Territory[],
  search: string
): Territory[] {
  const q = search.trim().toLowerCase();
  if (!q) return territories;
  return territories.filter((t) =>
    [t.territoryCode, t.territoryName, t.territoryType, t.region]
      .filter(Boolean)
      .some((v) => v!.toLowerCase().includes(q))
  );
}
