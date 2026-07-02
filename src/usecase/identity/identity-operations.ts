/**
 * Identity operations: link the signed-in user to their employee row or
 * provision a new one. Both reuse the shared employee write ops (so the durable
 * Entra oid back-fill and the new-record create go through the same
 * repository + audit path) and the pure `domain/policies/employee-identity`
 * rules for building the input from the signed-in identity.
 */
import { employeeSnapshot } from '@/domain/models/employee';
import { employeeInputFromUser } from '@/domain/policies/employee-identity';
import type { AuthUser } from '@/domain/ports/auth-service';
import type { Employee } from '@/domain/types';
import {
  createEmployee,
  updateEmployee,
  type EmployeeWriteDeps,
} from '@/usecase/employees/employee-operations';

export type IdentityDeps = EmployeeWriteDeps;

/**
 * Back-fill the durable Entra object id (and any missing upn / email) onto an
 * existing employee row matched to the signed-in user.
 */
export function linkEmployeeToUser(
  deps: IdentityDeps,
  employee: Employee,
  user: AuthUser
): Promise<Employee> {
  return updateEmployee(deps, employee.id, {
    ...employeeSnapshot(employee),
    entraObjectId: user.id || employee.entraObjectId,
    upn: employee.upn || user.email || undefined,
    email: employee.email || user.email || undefined,
  });
}

/** Provision a fresh employee row prefilled from the signed-in identity. */
export function provisionEmployeeFromUser(
  deps: IdentityDeps,
  user: AuthUser
): Promise<Employee> {
  return createEmployee(deps, employeeInputFromUser(user));
}
