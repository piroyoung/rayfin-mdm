/** Role master service: CRUD for the single role catalogue. */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import type { Role } from '@/domain/types';

export interface RoleInput {
  code: string;
  name: string;
  category?: string;
  description?: string;
  orgUnit?: string;
  solutionArea?: string;
  subArea?: string;
  roleFamily?: string;
  isAccountAssignable?: boolean;
  isTerritoryAssignable?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

function roles() {
  return getRayfinClient().data.Role;
}

/** Keep in sync with rayfin/data/Role.ts. */
const ROLE_FIELDS = [
  'id',
  'code',
  'name',
  'category',
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

export async function listRoles(): Promise<Role[]> {
  const rows = await roles().select(ROLE_FIELDS).execute();
  return [...rows].sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.code.localeCompare(b.code)
  );
}

/** Active roles that can be attached to an account-level assignment. */
export async function listAccountAssignableRoles(): Promise<Role[]> {
  const rows = await listRoles();
  return rows.filter((r) => r.isActive && r.isAccountAssignable);
}

export function getRole(id: string): Promise<Role | null> {
  return roles()
    .select(ROLE_FIELDS)
    .where({ id: { eq: id } })
    .findFirst();
}

export async function createRole(input: RoleInput): Promise<Role> {
  const created = await roles().create({
    code: input.code,
    name: input.name,
    category: input.category,
    description: input.description,
    orgUnit: input.orgUnit,
    solutionArea: input.solutionArea,
    subArea: input.subArea,
    roleFamily: input.roleFamily,
    isAccountAssignable: input.isAccountAssignable ?? true,
    isTerritoryAssignable: input.isTerritoryAssignable ?? false,
    sortOrder: input.sortOrder,
    isActive: input.isActive ?? true,
    createdBy: actorId(),
    createdAt: new Date(),
  });
  await logAudit({
    domain: 'role',
    action: 'create',
    recordId: created.id,
    recordLabel: input.code,
    summary: `Created role ${input.code} (${input.name})`,
  });
  return created;
}

export async function updateRole(id: string, input: RoleInput): Promise<Role> {
  const updated = await roles().update(
    { id },
    {
      code: input.code,
      name: input.name,
      category: input.category,
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
  await logAudit({
    domain: 'role',
    action: 'update',
    recordId: id,
    recordLabel: input.code,
    summary: `Updated role ${input.code}`,
  });
  return updated;
}
