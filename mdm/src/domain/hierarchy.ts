/**
 * Pure parent/child hierarchy helpers, shared by Territory, Employee (manager)
 * and Account (parent account) cycle checks. No Rayfin/network dependency.
 */

export interface HierarchyNode {
  id: string;
  parentId?: string | null;
}

/**
 * Return the set of node ids that participate in a parent cycle (including a
 * node that is its own parent). Edges to missing parents are simply dead ends.
 *
 * Iterative DFS with a three-colour marker so a malformed graph can never blow
 * the stack or loop forever.
 */
export function detectCycles(nodes: HierarchyNode[]): Set<string> {
  const parentOf = new Map<string, string | undefined>();
  for (const n of nodes) parentOf.set(n.id, n.parentId ?? undefined);

  const UNVISITED = 0;
  const IN_STACK = 1;
  const DONE = 2;
  const state = new Map<string, 0 | 1 | 2>();
  const inCycle = new Set<string>();

  for (const start of parentOf.keys()) {
    if (state.get(start)) continue;
    const path: string[] = [];
    let cur: string | undefined = start;

    while (
      cur !== undefined &&
      parentOf.has(cur) &&
      state.get(cur) !== DONE
    ) {
      if (state.get(cur) === IN_STACK) {
        // Re-entered a node still on the current path → cycle.
        const idx = path.indexOf(cur);
        for (let i = idx; i < path.length; i++) inCycle.add(path[i]);
        break;
      }
      state.set(cur, IN_STACK);
      path.push(cur);
      cur = parentOf.get(cur);
    }

    for (const id of path) {
      if (state.get(id) === IN_STACK) state.set(id, DONE);
    }
    void UNVISITED;
  }

  return inCycle;
}

/** True when setting `parentId` on `id` would introduce a cycle. */
export function wouldCreateCycle(
  nodes: HierarchyNode[],
  id: string,
  parentId: string | null | undefined
): boolean {
  if (!parentId) return false;
  if (parentId === id) return true;
  const next = nodes.map((n) => (n.id === id ? { ...n, parentId } : n));
  return detectCycles(next).has(id);
}
