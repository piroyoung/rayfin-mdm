/**
 * Pure identity-resolution rules matching the signed-in user to their employee
 * row. The durable key is the Entra object id (oid), carried as `AuthUser.id`
 * and stored on `Employee.entraObjectId`; alias / upn / email can change, the
 * oid does not.
 */
import type { AuthUser } from '@/domain/ports/auth-service';
import type { EmployeeInput } from '@/domain/repositories/employee-repository';
import type { Employee } from '@/domain/types';

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
 * Resolve the signed-in user to their employee row.
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
