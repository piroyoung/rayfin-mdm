/** Pure derivations for the Roles screen: search/active filtering + snapshot. */
import type { RoleInput } from '@/domain/repositories/role-repository';
import type { Role } from '@/domain/types';
import { matchesActive, type ActiveFilterValue } from '@/lib/listing';

/** Filter the role list by the active-status dropdown and free-text search. */
export function filterRoles(
  roles: Role[],
  search: string,
  activeFilter: ActiveFilterValue
): Role[] {
  const q = search.trim().toLowerCase();
  return roles.filter((r) => {
    if (!matchesActive(activeFilter, r.isActive)) return false;
    if (!q) return true;
    return [r.name, r.solutionArea, r.orgUnit, r.subArea, r.roleFamily]
      .filter(Boolean)
      .some((v) => v!.toLowerCase().includes(q));
  });
}

/** Build an editable input snapshot from an existing role (edit / copy-row). */
export function roleSnapshot(r: Role): RoleInput {
  return {
    name: r.name,
    description: r.description,
    orgUnit: r.orgUnit,
    solutionArea: r.solutionArea,
    subArea: r.subArea,
    roleFamily: r.roleFamily,
    isAccountAssignable: r.isAccountAssignable,
    isTerritoryAssignable: r.isTerritoryAssignable,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
  };
}
