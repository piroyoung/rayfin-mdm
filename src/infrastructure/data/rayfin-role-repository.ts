/**
 * {@link RoleRepository} adapter over `client.data.Role`. Owns the field
 * projection, business-key generation, and actor stamping; audit logging is the
 * use case's responsibility, so this adapter depends only on {@link ActorContext}.
 */
import type { ActorContext } from '@/domain/ports/actor-context';
import { nextUniqueRoleCode } from '@/domain/policies/role-code';
import type {
  RoleInput,
  RoleRepository,
} from '@/domain/repositories/role-repository';
import type { Role } from '@/domain/types';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

/** Keep in sync with rayfin/data/Role.ts. */
const ROLE_FIELDS = [
  'id',
  'code',
  'name',
  'description',
  'orgUnit',
  'solutionArea',
  'subArea',
  'roleFamily',
  'isAccountAssignable',
  'isTerritoryAssignable',
  'sortOrder',
  'isActive',
  'createdBy',
  'createdAt',
] as const;

export class RayfinRoleRepository implements RoleRepository {
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly actor: ActorContext
  ) {}

  private get entity() {
    return this.client.data.Role;
  }

  async list(): Promise<Role[]> {
    const rows = await this.entity.select(ROLE_FIELDS).execute();
    return [...rows].sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)
    );
  }

  async listAccountAssignable(): Promise<Role[]> {
    const rows = await this.list();
    return rows.filter((r) => r.isActive && r.isAccountAssignable);
  }

  getById(id: string): Promise<Role | null> {
    return this.entity
      .select(ROLE_FIELDS)
      .where({ id: { eq: id } })
      .findFirst();
  }

  async create(input: RoleInput): Promise<Role> {
    const code = input.code?.trim()
      ? input.code.trim()
      : nextUniqueRoleCode(
          input.name,
          (await this.list()).map((r) => r.code)
        );
    const created = await this.entity.create({
      code,
      name: input.name,
      description: input.description,
      orgUnit: input.orgUnit,
      solutionArea: input.solutionArea,
      subArea: input.subArea,
      roleFamily: input.roleFamily,
      isAccountAssignable: input.isAccountAssignable ?? true,
      isTerritoryAssignable: input.isTerritoryAssignable ?? false,
      sortOrder: input.sortOrder,
      isActive: input.isActive ?? true,
      createdBy: this.actor.actorId(),
      createdAt: new Date(),
    });
    // Guarantee the resolved code/name are present for the caller's audit entry
    // even if the create response omits unselected fields.
    return { ...created, code, name: input.name } as Role;
  }

  update(id: string, input: RoleInput): Promise<Role> {
    return this.entity.update(
      { id },
      {
        name: input.name,
        description: input.description,
        orgUnit: input.orgUnit,
        solutionArea: input.solutionArea,
        subArea: input.subArea,
        roleFamily: input.roleFamily,
        isAccountAssignable: input.isAccountAssignable ?? true,
        isTerritoryAssignable: input.isTerritoryAssignable ?? false,
        sortOrder: input.sortOrder,
        isActive: input.isActive ?? true,
      }
    );
  }
}
