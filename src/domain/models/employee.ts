/** Pure projections and display helpers for the employee master. */
import type { EmployeeInput } from '@/domain/repositories/employee-repository';
import type { Employee } from '@/domain/types';

/** Project a stored row back to its steward-editable input shape. */
export function employeeSnapshot(e: Employee): EmployeeInput {
  return {
    personnelNumber: e.personnelNumber,
    alias: e.alias,
    upn: e.upn,
    email: e.email,
    entraObjectId: e.entraObjectId,
    displayName: e.displayName,
    localName: e.localName,
    jobTitle: e.jobTitle,
    roleTypeCode: e.roleTypeCode,
    countryCode: e.countryCode,
    officeLocation: e.officeLocation,
    employmentStatus: e.employmentStatus,
    isActive: e.isActive,
  };
}

/** Human label for audit/records: `Display Name (ALIAS)` when an alias exists. */
export function employeeLabel(e: {
  displayName: string;
  alias?: string;
}): string {
  return e.alias ? `${e.displayName} (${e.alias})` : e.displayName;
}
