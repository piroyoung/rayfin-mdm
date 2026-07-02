/** Pure derivations for the Employees screen: search/active filter + conflicts. */
import type { EmployeeIdentityConflict } from '@/domain/policies/employee-conflicts';
import type { Employee } from '@/domain/types';
import { matchesActive, type ActiveFilterValue } from '@/lib/listing';

/** Filter the employee list by the active-status dropdown and free-text search. */
export function filterEmployees(
  employees: Employee[],
  search: string,
  activeFilter: ActiveFilterValue
): Employee[] {
  const q = search.trim().toLowerCase();
  return employees.filter((e) => {
    if (!matchesActive(activeFilter, e.isActive)) return false;
    if (!q) return true;
    return [e.displayName, e.localName, e.alias, e.upn, e.email, e.jobTitle]
      .filter(Boolean)
      .some((v) => v!.toLowerCase().includes(q));
  });
}

/** Flatten identity conflicts to the set of employee ids they touch. */
export function conflictedIdSet(
  conflicts: EmployeeIdentityConflict[]
): Set<string> {
  return new Set(conflicts.flatMap((c) => c.ids));
}
