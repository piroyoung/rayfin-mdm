/**
 * Territory-role roster persistence port: who holds each role seat in a
 * territory (`TerritoryRoleAssignment`). The single-seat SCD-Type-2 swap
 * (`reassignSeat`) is a persistence mechanic owned by the adapter; deciding
 * whether to create, swap, or no-op, transition legality, and audit logging are
 * the use case's responsibility.
 */
import type { AssignmentStatus, TerritoryRoleAssignment } from '@/domain/types';

export interface TerritoryRoleAssignmentInput {
  territoryId: string;
  employeeId: string;
  fiscalYearId: string;
  roleTypeCode: string;
  assignmentStatus?: AssignmentStatus;
  startDate?: Date;
  sourceSystem?: string;
  sourceRecordId?: string;
}

export interface TerritoryRoleAssignmentRepository {
  /** Every seat row across all territories. */
  list(): Promise<TerritoryRoleAssignment[]>;
  /** Seat rows for one territory, optionally scoped to a fiscal year. */
  listForTerritory(
    territoryId: string,
    fiscalYearId?: string
  ): Promise<TerritoryRoleAssignment[]>;
  create(
    input: TerritoryRoleAssignmentInput
  ): Promise<TerritoryRoleAssignment>;
  /**
   * SCD-Type-2 swap of a seat's holder: end-date the current holder and open a
   * fresh current row for the new member. Seat history is preserved.
   */
  reassignSeat(
    holder: TerritoryRoleAssignment,
    newEmployeeId: string
  ): Promise<TerritoryRoleAssignment>;
  /**
   * Apply a validated status transition, deriving the SCD end-date / current
   * flag. The caller checks the transition is legal first.
   */
  setStatus(
    record: TerritoryRoleAssignment,
    status: AssignmentStatus
  ): Promise<TerritoryRoleAssignment>;
  delete(id: string): Promise<void>;
}
