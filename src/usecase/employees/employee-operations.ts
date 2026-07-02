/**
 * Shared employee write operations: persist through the repository port and
 * append the matching audit entry in one place. Reused by the employees screen
 * view-model and the identity (link / provision) flow so the create / update
 * audit shapes stay single-sourced.
 */
import { employeeLabel } from '@/domain/models/employee';
import type { AuditLog } from '@/domain/ports/audit-log';
import type {
  EmployeeInput,
  EmployeeRepository,
} from '@/domain/repositories/employee-repository';
import type { Employee } from '@/domain/types';

export interface EmployeeWriteDeps {
  employees: EmployeeRepository;
  audit: AuditLog;
}

/** Create an employee row and record the create in the audit trail. */
export async function createEmployee(
  deps: EmployeeWriteDeps,
  input: EmployeeInput
): Promise<Employee> {
  const created = await deps.employees.create(input);
  await deps.audit.log({
    domain: 'employee',
    action: 'create',
    recordId: created.id,
    recordLabel: employeeLabel(input),
    summary: `Created employee ${input.displayName}`,
  });
  return created;
}

/** Update an employee row and record the update in the audit trail. */
export async function updateEmployee(
  deps: EmployeeWriteDeps,
  id: string,
  input: EmployeeInput
): Promise<Employee> {
  const updated = await deps.employees.update(id, input);
  await deps.audit.log({
    domain: 'employee',
    action: 'update',
    recordId: id,
    recordLabel: employeeLabel(input),
    summary: `Updated employee ${input.displayName}`,
  });
  return updated;
}
