/** Reference / lookup data (governed code lists) CRUD + grouping helpers. */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import type { ReferenceValue } from '@/domain/types';

export interface ReferenceInput {
  setName: string;
  code: string;
  label: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
}

function reference() {
  return getRayfinClient().data.ReferenceValue;
}

/**
 * Explicit field projection — the Rayfin/DAB client returns only the primary key
 * unless fields are selected. Keep in sync with rayfin/data/ReferenceValue.ts.
 */
const REFERENCE_FIELDS = [
  'id',
  'setName',
  'code',
  'label',
  'parentId',
  'sortOrder',
  'isActive',
  'createdBy',
  'createdAt',
] as const;

export async function listReference(): Promise<ReferenceValue[]> {
  const rows = await reference().select(REFERENCE_FIELDS).execute();
  return [...rows].sort(
    (a, b) =>
      a.setName.localeCompare(b.setName) ||
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      a.label.localeCompare(b.label)
  );
}

export async function createReference(
  input: ReferenceInput
): Promise<ReferenceValue> {
  const created = await reference().create({
    setName: input.setName,
    code: input.code,
    label: input.label,
    parentId: input.parentId,
    sortOrder: input.sortOrder,
    isActive: input.isActive ?? true,
    createdBy: actorId(),
    createdAt: new Date(),
  });
  await logAudit({
    domain: 'reference',
    action: 'create',
    recordId: created.id,
    recordLabel: `${input.setName} / ${input.code}`,
    summary: `Added reference ${input.setName}: ${input.label}`,
  });
  return created;
}

export async function updateReference(
  id: string,
  input: ReferenceInput
): Promise<ReferenceValue> {
  const updated = await reference().update(
    { id },
    {
      setName: input.setName,
      code: input.code,
      label: input.label,
      parentId: input.parentId,
      sortOrder: input.sortOrder,
      isActive: input.isActive ?? true,
    }
  );
  await logAudit({
    domain: 'reference',
    action: 'update',
    recordId: id,
    recordLabel: `${input.setName} / ${input.code}`,
    summary: `Updated reference ${input.setName}: ${input.label}`,
  });
  return updated;
}

export async function deleteReference(record: ReferenceValue): Promise<void> {
  await reference().delete({ id: record.id });
  await logAudit({
    domain: 'reference',
    action: 'delete',
    recordId: record.id,
    recordLabel: `${record.setName} / ${record.code}`,
    summary: `Deleted reference ${record.setName}: ${record.label}`,
  });
}

/** Group reference values by their `setName`, preserving sort order. */
export function groupReference(
  rows: ReferenceValue[]
): Array<{ setName: string; values: ReferenceValue[] }> {
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
