/**
 * {@link ReferenceRepository} adapter over `client.data.ReferenceValue`. Owns the
 * field projection and actor stamping; audit logging is the use case's
 * responsibility, so this adapter depends only on {@link ActorContext}.
 */
import type { ActorContext } from '@/domain/ports/actor-context';
import type {
  ReferenceInput,
  ReferenceRepository,
} from '@/domain/repositories/reference-repository';
import type { ReferenceValue } from '@/domain/types';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

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

export class RayfinReferenceRepository implements ReferenceRepository {
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly actor: ActorContext
  ) {}

  private get entity() {
    return this.client.data.ReferenceValue;
  }

  async list(): Promise<ReferenceValue[]> {
    const rows = await this.entity.select(REFERENCE_FIELDS).execute();
    return [...rows].sort(
      (a, b) =>
        a.setName.localeCompare(b.setName) ||
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.label.localeCompare(b.label)
    );
  }

  async create(input: ReferenceInput): Promise<ReferenceValue> {
    const created = await this.entity.create({
      setName: input.setName,
      code: input.code,
      label: input.label,
      parentId: input.parentId,
      sortOrder: input.sortOrder,
      isActive: input.isActive ?? true,
      createdBy: this.actor.actorId(),
      createdAt: new Date(),
    });
    // Guarantee the input values are present for the caller's audit entry even
    // if the create response omits unselected fields.
    return {
      ...created,
      setName: input.setName,
      code: input.code,
      label: input.label,
    } as ReferenceValue;
  }

  update(id: string, input: ReferenceInput): Promise<ReferenceValue> {
    return this.entity.update(
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
  }

  async delete(id: string): Promise<void> {
    await this.entity.delete({ id });
  }
}
