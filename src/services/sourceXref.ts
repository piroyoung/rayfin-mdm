/**
 * Source cross-reference service: maps stable MDM ids to their identifiers in
 * source systems (CRM, MSSales, HR, Excel ingests). Keeps external ids out of
 * MDM primary keys so a source rename/merge never disturbs the surrogate id.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { logAudit } from '@/services/audit';
import type { SourceXref } from '@/domain/types';

export interface SourceXrefInput {
  mdmEntityType: string;
  mdmEntityId: string;
  sourceSystem: string;
  sourceEntityType?: string;
  sourceRecordId: string;
  sourceRecordName?: string;
}

function sourceXrefs() {
  return getRayfinClient().data.SourceXref;
}

/** Keep in sync with rayfin/data/SourceXref.ts. */
const SOURCE_XREF_FIELDS = [
  'id',
  'mdmEntityType',
  'mdmEntityId',
  'sourceSystem',
  'sourceEntityType',
  'sourceRecordId',
  'sourceRecordName',
  'validFrom',
  'validTo',
  'currentFlag',
  'createdAt',
  'updatedAt',
] as const;

export async function listSourceXrefs(): Promise<SourceXref[]> {
  return [...(await sourceXrefs().select(SOURCE_XREF_FIELDS).execute())];
}

/** Every source id currently mapped to one MDM record. */
export function xrefsForEntity(
  mdmEntityType: string,
  mdmEntityId: string
): Promise<SourceXref[]> {
  return sourceXrefs()
    .select(SOURCE_XREF_FIELDS)
    .where({
      mdmEntityType: { eq: mdmEntityType },
      mdmEntityId: { eq: mdmEntityId },
    })
    .execute()
    .then((rows) => [...rows]);
}

/** Resolve a source identifier back to its MDM record(s). */
export function findBySource(
  sourceSystem: string,
  sourceRecordId: string
): Promise<SourceXref | null> {
  return sourceXrefs()
    .select(SOURCE_XREF_FIELDS)
    .where({
      sourceSystem: { eq: sourceSystem },
      sourceRecordId: { eq: sourceRecordId },
      currentFlag: { eq: true },
    })
    .findFirst();
}

export async function createSourceXref(
  input: SourceXrefInput
): Promise<SourceXref> {
  const now = new Date();
  const created = await sourceXrefs().create({
    ...input,
    validFrom: now,
    currentFlag: true,
    createdAt: now,
    updatedAt: now,
  });
  await logAudit({
    domain: 'source_xref',
    action: 'create',
    recordId: created.id,
    recordLabel: `${input.sourceSystem}:${input.sourceRecordId}`,
    summary: `Linked ${input.mdmEntityType} to ${input.sourceSystem} ${input.sourceRecordId}`,
  });
  return created;
}

/**
 * Idempotent link: reuse an existing current xref for the same source id /
 * entity, otherwise create one. Used by the Phase 6 ingest.
 */
export async function ensureSourceXref(
  input: SourceXrefInput
): Promise<SourceXref> {
  const existing = await xrefsForEntity(input.mdmEntityType, input.mdmEntityId);
  const match = existing.find(
    (x) =>
      x.currentFlag &&
      x.sourceSystem === input.sourceSystem &&
      x.sourceRecordId === input.sourceRecordId
  );
  if (match) return match;
  return createSourceXref(input);
}
