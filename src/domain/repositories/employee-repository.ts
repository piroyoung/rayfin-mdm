/**
 * Employee master persistence port. Employees are the sales-team-member master;
 * the app depends on this interface and the Rayfin-backed adapter lives in
 * `src/infrastructure/data/`.
 */
import type { Employee } from '@/domain/types';

export interface EmployeeInput {
  personnelNumber?: string;
  alias?: string;
  upn?: string;
  email?: string;
  entraObjectId?: string;
  displayName: string;
  localName?: string;
  jobTitle?: string;
  roleTypeCode?: string;
  countryCode?: string;
  officeLocation?: string;
  employmentStatus?: string;
  isActive?: boolean;
}

export interface EmployeeRepository {
  /** All employees, ordered by display name. */
  list(): Promise<Employee[]>;
  getById(id: string): Promise<Employee | null>;
  create(input: EmployeeInput): Promise<Employee>;
  update(id: string, input: EmployeeInput): Promise<Employee>;
  /** Flip the active flag on a single row. */
  setActive(id: string, isActive: boolean): Promise<Employee>;
}
