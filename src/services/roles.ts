/**
 * Role master service (legacy staging shim). Retained for un-migrated consumers
 * (seed, roster/stewardship/assignment pages, projection test) until each
 * migrates onto {@link RoleRepository}. Shares the business-key policy and the
 * `RoleInput` contract with the domain layer so there is no drift.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import { nextUniqueRoleCode } from '@/domain/policies/role-code';
import type { Role } from '@/domain/types';

export type { RoleInput } from '@/domain/repositories/role-repository';
import type { RoleInput } from '@/domain/repositories/role-repository';

function roles() {
  return getRayfinClient().data.Role;
}

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

export async function listRoles(): Promise<Role[]> {
  const rows = await roles().select(ROLE_FIELDS).execute();
  return [...rows].sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)
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
  const code = input.code?.trim()
    ? input.code.trim()
    : nextUniqueRoleCode(input.name, (await listRoles()).map((r) => r.code));
  const created = await roles().create({
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
    createdBy: actorId(),
    createdAt: new Date(),
  });
  await logAudit({
    domain: 'role',
    action: 'create',
    recordId: created.id,
    recordLabel: input.name,
    summary: `Created role ${input.name} (${code})`,
  });
  return created;
}

export async function updateRole(id: string, input: RoleInput): Promise<Role> {
  const updated = await roles().update(
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
  await logAudit({
    domain: 'role',
    action: 'update',
    recordId: id,
    recordLabel: input.name,
    summary: `Updated role ${input.name}`,
  });
  return updated;
}
