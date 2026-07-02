/**
 * Idempotent source-cross-reference linking for the ingest pipeline. Reuses an
 * existing current xref for the same source id / entity, otherwise creates one
 * through the {@link SourceXrefRepository} and records it. The repository owns
 * the temporal stamping; this operation owns the idempotent decision and audit.
 */
import type { AuditLog } from '@/domain/ports/audit-log';
import type {
  SourceXrefInput,
  SourceXrefRepository,
} from '@/domain/repositories/source-xref-repository';
import type { SourceXref } from '@/domain/types';

export interface SourceXrefDeps {
  sourceXrefs: SourceXrefRepository;
  audit: AuditLog;
}

/** Link an MDM record to a source identifier, reusing a current match. */
export async function ensureSourceXref(
  deps: SourceXrefDeps,
  input: SourceXrefInput
): Promise<SourceXref> {
  const existing = await deps.sourceXrefs.listForEntity(
    input.mdmEntityType,
    input.mdmEntityId
  );
  const match = existing.find(
    (x) =>
      x.currentFlag &&
      x.sourceSystem === input.sourceSystem &&
      x.sourceRecordId === input.sourceRecordId
  );
  if (match) return match;

  const created = await deps.sourceXrefs.create(input);
  await deps.audit.log({
    domain: 'source_xref',
    action: 'create',
    recordId: created.id,
    recordLabel: `${input.sourceSystem}:${input.sourceRecordId}`,
    summary: `Linked ${input.mdmEntityType} to ${input.sourceSystem} ${input.sourceRecordId}`,
  });
  return created;
}
