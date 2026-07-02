/** Pure derivations for the Reference Data screen. */
import type { ReferenceInput } from '@/domain/repositories/reference-repository';
import type { ReferenceValue } from '@/domain/types';

export interface ReferenceGroup {
  setName: string;
  values: ReferenceValue[];
}

/** Group reference values by their `setName`, preserving sort order. */
export function groupReference(rows: ReferenceValue[]): ReferenceGroup[] {
  const map = new Map<string, ReferenceValue[]>();
  for (const r of rows) {
    const arr = map.get(r.setName) ?? [];
    arr.push(r);
    map.set(r.setName, arr);
  }
  return [...map.entries()]
    .map(([setName, values]) => ({ setName, values }))
    .sort((a, b) => a.setName.localeCompare(b.setName));
}

/** Build an editable input snapshot from an existing reference value. */
export function referenceSnapshot(v: ReferenceValue): ReferenceInput {
  return {
    setName: v.setName,
    code: v.code,
    label: v.label,
    parentId: v.parentId,
    sortOrder: v.sortOrder ?? 0,
    isActive: v.isActive,
  };
}
