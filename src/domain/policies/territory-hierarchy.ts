/**
 * Territory hierarchy policy. A territory may not become its own ancestor; this
 * wraps the generic {@link wouldCreateCycle} check with the territory→node
 * mapping so the use case can validate a re-parent before persisting.
 */
import { wouldCreateCycle, type HierarchyNode } from '@/domain/hierarchy';
import type { Territory } from '@/domain/types';

/** True when re-parenting `id` under `parentId` would introduce a cycle. */
export function territoryWouldCreateCycle(
  territories: Territory[],
  id: string,
  parentId: string | null | undefined
): boolean {
  const nodes: HierarchyNode[] = territories.map((t) => ({
    id: t.id,
    parentId: t.parentTerritoryId,
  }));
  return wouldCreateCycle(nodes, id, parentId);
}
