/**
 * Source cross-reference persistence port. A source xref maps a stable MDM id to
 * its identifier in a source system (CRM, MSSales, HR, Excel ingests), keeping
 * external ids out of MDM primary keys. The Rayfin adapter owns the field
 * projection and the temporal (validFrom / currentFlag) stamping; the idempotent
 * "ensure" decision and audit logging are the ingest use case's responsibility.
 */
import type { SourceXref } from '@/domain/types';

export interface SourceXrefInput {
  mdmEntityType: string;
  mdmEntityId: string;
  sourceSystem: string;
  sourceEntityType?: string;
  sourceRecordId: string;
  sourceRecordName?: string;
}

export interface SourceXrefRepository {
  /** Every source cross-reference. */
  list(): Promise<SourceXref[]>;
  /** Every source id currently mapped to one MDM record. */
  listForEntity(
    mdmEntityType: string,
    mdmEntityId: string
  ): Promise<SourceXref[]>;
  /** Create a new current cross-reference. */
  create(input: SourceXrefInput): Promise<SourceXref>;
}
