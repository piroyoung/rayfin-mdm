/**
 * Entra identity helpers — backlog shim.
 *
 * The pure identity-resolution rules now live in
 * `@/domain/policies/employee-identity` (imported by the Employees use case and
 * re-exported here for not-yet-migrated callers such as `MyIdentityCard`). The
 * two write operations below still delegate to the legacy employee service, so
 * they stay here until the identity/stewardship screen is migrated.
 *
 * Scope note: the Rayfin/Fabric SDK federates only the *current* signed-in user.
 * It does not expose a tenant directory, so there is intentionally no
 * "search any colleague" lookup here — that would require Microsoft Graph.
 */
import type { AuthUser } from '@/domain/ports/auth-service';
import {
  aliasFromIdentity,
  employeeInputFromUser,
  matchEmployeeToUser,
  type IdentityMatch,
} from '@/domain/policies/employee-identity';
import type { Employee } from '@/domain/types';
import { createEmployee, updateEmployee, toEmployeeInput } from '@/services/employees';

export {
  aliasFromIdentity,
  employeeInputFromUser,
  matchEmployeeToUser,
  type IdentityMatch,
};

/**
 * Back-fill the durable Entra oid (and upn / email if missing) onto an existing
 * employee row, turning an `unlinked` match into a `linked` one.
 */
export function linkEmployeeToUser(
  employee: Employee,
  user: AuthUser
): Promise<Employee> {
  return updateEmployee(employee.id, {
    ...toEmployeeInput(employee),
    entraObjectId: user.id || employee.entraObjectId,
    upn: employee.upn || user.email || undefined,
    email: employee.email || user.email || undefined,
  });
}

/** Create a fresh employee row from the signed-in identity. */
export function provisionEmployeeFromUser(user: AuthUser): Promise<Employee> {
  return createEmployee(employeeInputFromUser(user));
}
