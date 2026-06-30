/** Role-type master service: CRUD for the assignment role catalogue. */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import type { RoleType } from '@/domain/types';

export interface RoleTypeInput {
  code: string;
  name: string;
  category?: string;
  description?: string;
  isAccountAssignable?: boolean;
  isTerritoryAssignable?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

function roleTypes() {
  return getRayfinClient().data.RoleType;
}

/** Keep in sync with rayfin/data/RoleType.ts. */
const ROLE_TYPE_FIELDS = [
  'id',
  'code',
  'name',
  'category',
  'description',
  'isAccountAssignable',
  'isTerritoryAssignable',
  'sortOrder',
  'isActive',
  'createdBy',
  'createdAt',
] as const;

export async function listRoleTypes(): Promise<RoleType[]> {
  const rows = await roleTypes().select(ROLE_TYPE_FIELDS).execute();
  return [...rows].sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.code.localeCompare(b.code)
  );
}

/** Active roles that can be attached to an account-employee assignment. */
export async function listAccountAssignableRoles(): Promise<RoleType[]> {
  const rows = await listRoleTypes();
  return rows.filter((r) => r.isActive && r.isAccountAssignable);
}

export function getRoleType(id: string): Promise<RoleType | null> {
  return roleTypes()
    .select(ROLE_TYPE_FIELDS)
    .where({ id: { eq: id } })
    .findFirst();
}

export async function createRoleType(input: RoleTypeInput): Promise<RoleType> {
  const created = await roleTypes().create({
    code: input.code,
    name: input.name,
    category: input.category,
    description: input.description,
    isAccountAssignable: input.isAccountAssignable ?? true,
    isTerritoryAssignable: input.isTerritoryAssignable ?? false,
    sortOrder: input.sortOrder,
    isActive: input.isActive ?? true,
    createdBy: actorId(),
    createdAt: new Date(),
  });
  await logAudit({
    domain: 'role_type',
    action: 'create',
    recordId: created.id,
    recordLabel: input.code,
    summary: `Created role type ${input.code} (${input.name})`,
  });
  return created;
}

export async function updateRoleType(
  id: string,
  input: RoleTypeInput
): Promise<RoleType> {
  const updated = await roleTypes().update(
    { id },
    {
      code: input.code,
      name: input.name,
      category: input.category,
      description: input.description,
      isAccountAssignable: input.isAccountAssignable ?? true,
      isTerritoryAssignable: input.isTerritoryAssignable ?? false,
      sortOrder: input.sortOrder,
      isActive: input.isActive ?? true,
    }
  );
  await logAudit({
    domain: 'role_type',
    action: 'update',
    recordId: id,
    recordLabel: input.code,
    summary: `Updated role type ${input.code}`,
  });
  return updated;
}
