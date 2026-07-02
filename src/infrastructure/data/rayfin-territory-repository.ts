/**
 * {@link TerritoryRepository} adapter over `client.data.Territory`. Owns the
 * field projection and actor/temporal stamping; parent-cycle validation and
 * audit logging are the use case's responsibility, so this adapter depends only
 * on {@link ActorContext}.
 */
import type { ActorContext } from '@/domain/ports/actor-context';
import type {
  TerritoryInput,
  TerritoryRepository,
} from '@/domain/repositories/territory-repository';
import type { Territory } from '@/domain/types';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

/**
 * Explicit field projection — the Rayfin/DAB client returns only the primary key
 * unless fields are selected. Keep in sync with rayfin/data/Territory.ts.
 */
const TERRITORY_FIELDS = [
  'id',
  'territoryCode',
  'territoryName',
  'territoryType',
  'parentTerritoryId',
  'fiscalYearId',
  'segmentCode',
  'industryCode',
  'region',
  'countryCode',
  'isActive',
  'validFrom',
  'validTo',
  'currentFlag',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
] as const;

export class RayfinTerritoryRepository implements TerritoryRepository {
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly actor: ActorContext
  ) {}

  private get entity() {
    return this.client.data.Territory;
  }

  async list(): Promise<Territory[]> {
    const rows = await this.entity.select(TERRITORY_FIELDS).execute();
    return [...rows].sort((a, b) =>
      a.territoryCode.localeCompare(b.territoryCode)
    );
  }

  getById(id: string): Promise<Territory | null> {
    return this.entity
      .select(TERRITORY_FIELDS)
      .where({ id: { eq: id } })
      .findFirst();
  }

  async create(input: TerritoryInput): Promise<Territory> {
    const now = new Date();
    const created = await this.entity.create({
      ...input,
      isActive: input.isActive ?? true,
      validFrom: now,
      currentFlag: true,
      createdBy: this.actor.actorId(),
      updatedBy: this.actor.actorId(),
      createdAt: now,
      updatedAt: now,
    });
    // Guarantee the caller's audit label has the identifying fields even if the
    // create response omits unselected columns.
    return {
      ...created,
      territoryCode: input.territoryCode,
      territoryName: input.territoryName,
    } as Territory;
  }

  update(id: string, input: TerritoryInput): Promise<Territory> {
    return this.entity.update(
      { id },
      {
        ...input,
        isActive: input.isActive ?? true,
        updatedBy: this.actor.actorId(),
        updatedAt: new Date(),
      }
    );
  }

  setActive(id: string, isActive: boolean): Promise<Territory> {
    return this.entity.update(
      { id },
      { isActive, updatedBy: this.actor.actorId(), updatedAt: new Date() }
    );
  }
}
