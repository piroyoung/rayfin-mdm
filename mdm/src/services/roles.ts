/** Role master service: CRUD for the single role catalogue. */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import type { Role } from '@/domain/types';

export interface RoleInput {
  /** Optional: auto-generated from `name` when omitted (UI never sets it). */
  code?: string;
  name: string;
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

/** Slugify a role name into an uppercase business-key stem. */
function slugifyRoleCode(name: string): string {
  const base = (name ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return base || 'ROLE';
}

/**
 * Build a unique `code` from a role name. `code` is the system join key
 * (Employee/TerritoryRoleAssignment reference it), so it must stay unique even
 * though users no longer type it — duplicate copies get a numeric suffix.
 */
async function generateUniqueRoleCode(name: string): Promise<string> {
  const base = slugifyRoleCode(name);
  const taken = new Set((await listRoles()).map((r) => r.code));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 10000; i += 1) {
    const candidate = `${base}_${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}_${Date.now()}`;
}

export async function createRole(input: RoleInput): Promise<Role> {
  const code = input.code?.trim()
    ? input.code.trim()
    : await generateUniqueRoleCode(input.name);
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
