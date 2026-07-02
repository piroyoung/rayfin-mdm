/**
 * Source cross-reference read model (legacy shim). The ingest write path now
 * lives in `usecase/ingest` behind the `SourceXrefRepository` port; this file
 * remains only for the projection test's `listSourceXrefs` read. New code must
 * depend on `@/domain/repositories/source-xref-repository`, not this module.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import type { SourceXref } from '@/domain/types';
import type { SourceXrefInput } from '@/domain/repositories/source-xref-repository';

export type { SourceXrefInput };

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
