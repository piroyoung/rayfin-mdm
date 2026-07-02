/**
 * {@link SourceXrefRepository} adapter over `client.data.SourceXref`. Owns the
 * field projection and the temporal (validFrom / currentFlag / timestamps)
 * stamping; the idempotent "ensure" decision and audit logging are the ingest
 * use case's responsibility, so this adapter needs no {@link ActorContext}.
 */
import type {
  SourceXrefInput,
  SourceXrefRepository,
} from '@/domain/repositories/source-xref-repository';
import type { SourceXref } from '@/domain/types';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

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

export class RayfinSourceXrefRepository implements SourceXrefRepository {
  constructor(private readonly client: RayfinClientFacade) {}

  private get entity() {
    return this.client.data.SourceXref;
  }

  async list(): Promise<SourceXref[]> {
    return [...(await this.entity.select(SOURCE_XREF_FIELDS).execute())];
  }

  listForEntity(
    mdmEntityType: string,
    mdmEntityId: string
  ): Promise<SourceXref[]> {
    return this.entity
      .select(SOURCE_XREF_FIELDS)
      .where({
        mdmEntityType: { eq: mdmEntityType },
        mdmEntityId: { eq: mdmEntityId },
      })
      .execute()
      .then((rows) => [...rows]);
  }

  create(input: SourceXrefInput): Promise<SourceXref> {
    const now = new Date();
    return this.entity.create({
      ...input,
      validFrom: now,
      currentFlag: true,
      createdAt: now,
      updatedAt: now,
    });
  }
}
