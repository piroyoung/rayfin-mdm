/**
 * Legacy employee master service — backlog shim.
 *
 * The clean-architecture home for employees is the {@link EmployeeRepository}
 * port + `RayfinEmployeeRepository` adapter, consumed via the Employees
 * use case. This module stays only for not-yet-migrated callers (seed, ingest,
 * data-quality, identity, territory/assignment screens). Types and pure rules
 * are re-exported from their canonical domain homes so there is no drift.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import { employeeLabel, employeeSnapshot } from '@/domain/models/employee';
import type { EmployeeInput } from '@/domain/repositories/employee-repository';
import type { Employee } from '@/domain/types';

export type { EmployeeInput } from '@/domain/repositories/employee-repository';
export type { EmployeeIdentityConflict } from '@/domain/policies/employee-conflicts';
export { findEmployeeIdentityConflicts } from '@/domain/policies/employee-conflicts';
/** @deprecated Import `employeeSnapshot` from `@/domain/models/employee`. */
export const toEmployeeInput = employeeSnapshot;

function employees() {
  return getRayfinClient().data.Employee;
}

/** Keep in sync with rayfin/data/Employee.ts. */
const EMPLOYEE_FIELDS = [
  'id',
  'personnelNumber',
  'alias',
  'upn',
  'email',
  'entraObjectId',
  'displayName',
  'localName',
  'jobTitle',
  'roleTypeCode',
  'countryCode',
  'officeLocation',
  'employmentStatus',
  'isActive',
  'validFrom',
  'validTo',
  'currentFlag',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
] as const;

export async function listEmployees(): Promise<Employee[]> {
  const rows = await employees().select(EMPLOYEE_FIELDS).execute();
  return [...rows].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function getEmployee(id: string): Promise<Employee | null> {
  return employees()
    .select(EMPLOYEE_FIELDS)
    .where({ id: { eq: id } })
    .findFirst();
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const now = new Date();
  const created = await employees().create({
    ...input,
    isActive: input.isActive ?? true,
    validFrom: now,
    currentFlag: true,
    createdBy: actorId(),
    updatedBy: actorId(),
    createdAt: now,
    updatedAt: now,
  });
  await logAudit({
    domain: 'employee',
    action: 'create',
    recordId: created.id,
    recordLabel: employeeLabel(input),
    summary: `Created employee ${input.displayName}`,
  });
  return created;
}

export async function updateEmployee(
  id: string,
  input: EmployeeInput
): Promise<Employee> {
  const updated = await employees().update(
    { id },
    {
      ...input,
      isActive: input.isActive ?? true,
      updatedBy: actorId(),
      updatedAt: new Date(),
    }
  );
  await logAudit({
    domain: 'employee',
    action: 'update',
    recordId: id,
    recordLabel: employeeLabel(input),
    summary: `Updated employee ${input.displayName}`,
  });
  return updated;
}

export async function setEmployeeActive(
  record: Employee,
  isActive: boolean
): Promise<Employee> {
  const updated = await employees().update(
    { id: record.id },
    { isActive, updatedBy: actorId(), updatedAt: new Date() }
  );
  await logAudit({
    domain: 'employee',
    action: 'status_change',
    recordId: record.id,
    recordLabel: employeeLabel(record),
    summary: `Employee ${record.displayName} → ${isActive ? 'active' : 'inactive'}`,
  });
  return updated;
}
