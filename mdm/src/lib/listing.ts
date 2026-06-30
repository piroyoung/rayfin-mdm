/** Framework-agnostic helpers shared by master-data list / table pages. */

/** Tri-state active filter used by master-table toolbars. */
export type ActiveFilterValue = 'all' | 'active' | 'inactive';

/** Whether a record's active flag passes the given tri-state filter. */
export function matchesActive(
  filter: ActiveFilterValue,
  isActive: boolean
): boolean {
  if (filter === 'active') return isActive;
  if (filter === 'inactive') return !isActive;
  return true;
}

/**
 * Build an id→label resolver from a list of records. Designed to be wrapped in
 * `useMemo(() => lookupFn(items, …), [items])` at the call site so the inline
 * key/label closures don't bust the memo.
 */
export function lookupFn<T>(
  items: T[],
  key: (item: T) => string,
  label: (item: T) => string,
  fallback: (id: string) => string = (id) => id
): (id: string) => string {
  const map = new Map(items.map((it) => [key(it), label(it)] as const));
  return (id: string) => map.get(id) ?? fallback(id);
}
