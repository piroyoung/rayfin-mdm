/**
 * Entra identity helpers.
 *
 * Every employee is a user in this Entra tenant, so the signed-in user — whose
 * identity is brokered into the app by Fabric auth (`AuthUser`) — can be matched
 * to, linked to, or used to provision their own {@link Employee} row. The
 * durable key is the Entra object id (oid), carried as `AuthUser.id` and stored
 * on `Employee.entraObjectId`; alias / upn / email can change, the oid does not.
 *
 * Scope note: the Rayfin/Fabric SDK federates only the *current* signed-in user.
 * It does not expose a tenant directory, so there is intentionally no
 * "search any colleague" lookup here — that would require Microsoft Graph.
 */
import type { AuthUser } from '@/services/IAuthService';
import type { Employee } from '@/domain/types';
import {
  createEmployee,
  updateEmployee,
  toEmployeeInput,
  type EmployeeInput,
} from '@/services/employees';

const norm = (v?: string | null) => (v ?? '').trim().toLowerCase();

/** Resolution of the signed-in user against the employee master. */
export type IdentityMatch =
  /** Matched on the durable Entra oid — fully linked. */
  | { kind: 'linked'; employee: Employee }
  /** Matched on upn / email, but the durable oid is not stored yet. */
  | { kind: 'unlinked'; employee: Employee }
  /** No employee row represents this user. */
  | { kind: 'none' };

/** Upper-cased local part of the sign-in address, matching workbook aliases. */
export function aliasFromIdentity(user: AuthUser): string | undefined {
  const local = (user.email || '').split('@')[0];
  return local ? local.toUpperCase() : undefined;
}

/**
 * Pure: resolve the signed-in user to their employee row.
 * Priority: durable oid → upn → email.
 */
export function matchEmployeeToUser(
  user: AuthUser,
  rows: Employee[]
): IdentityMatch {
  const oid = norm(user.id);
  if (oid) {
    const byOid = rows.find((r) => norm(r.entraObjectId) === oid);
    if (byOid) return { kind: 'linked', employee: byOid };
  }
  const mail = norm(user.email);
  if (mail) {
    const byUpn = rows.find((r) => norm(r.upn) === mail);
    if (byUpn) return { kind: 'unlinked', employee: byUpn };
    const byEmail = rows.find((r) => norm(r.email) === mail);
    if (byEmail) return { kind: 'unlinked', employee: byEmail };
  }
  return { kind: 'none' };
}

/** Build a create/edit input prefilled from the signed-in identity. */
export function employeeInputFromUser(user: AuthUser): EmployeeInput {
  return {
    displayName: user.name || user.email || 'New employee',
    email: user.email || undefined,
    upn: user.email || undefined,
    alias: aliasFromIdentity(user),
    entraObjectId: user.id || undefined,
    isActive: true,
  };
}

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
