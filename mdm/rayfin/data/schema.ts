import type { Account } from './Account.js';
import type { AccountEmployeeAssignment } from './AccountEmployeeAssignment.js';
import type { AccountTerritoryAssignment } from './AccountTerritoryAssignment.js';
import type { AuditEvent } from './AuditEvent.js';
import type { ChangeRequest } from './ChangeRequest.js';
import type { DataQualityIssue } from './DataQualityIssue.js';
import type { Employee } from './Employee.js';
import type { FiscalYear } from './FiscalYear.js';
import type { ReferenceValue } from './ReferenceValue.js';
import type { RoleType } from './RoleType.js';
import type { SourceXref } from './SourceXref.js';
import type { Territory } from './Territory.js';
import type { TerritoryRoleAssignment } from './TerritoryRoleAssignment.js';

/**
 * Binds entity names to their classes so `RayfinClient` exposes typed
 * `client.data.<Entity>` GraphQL proxies. Every entity must be registered here.
 */
export type MdmSchema = {
  // Core master
  Account: Account;
  ChangeRequest: ChangeRequest;
  AuditEvent: AuditEvent;
  ReferenceValue: ReferenceValue;
  // Territory-assignment MDM domain
  FiscalYear: FiscalYear;
  RoleType: RoleType;
  Employee: Employee;
  Territory: Territory;
  AccountTerritoryAssignment: AccountTerritoryAssignment;
  TerritoryRoleAssignment: TerritoryRoleAssignment;
  AccountEmployeeAssignment: AccountEmployeeAssignment;
  SourceXref: SourceXref;
  DataQualityIssue: DataQualityIssue;
};
