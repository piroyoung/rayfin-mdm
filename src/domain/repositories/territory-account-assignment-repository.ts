/**
 * Territory-placement persistence port: which territory an account sits in for a
 * given fiscal year (`TerritoryAccountAssignment`), fiscal-year scoped with
 * SCD-Type-2 history. The app depends on this interface; the Rayfin-backed
 * implementation lives in `src/infrastructure/data/`. Transition legality
 * (`assertTransition`) and audit logging are the use case's responsibility.
 */
import type { AssignmentStatus, TerritoryAccountAssignment } from '@/domain/types';

export interface TerritoryAssignmentInput {
  accountId: string;
  territoryId: string;
  fiscalYearId: string;
  assignmentType?: string;
  assignmentStatus?: AssignmentStatus;
  startDate?: Date;
  sourceSystem?: string;
  sourceRecordId?: string;
}

export interface TerritoryAccountAssignmentRepository {
  /** Every placement row across all accounts. */
  list(): Promise<TerritoryAccountAssignment[]>;
  /** Placement rows (all history) for one account. */
  listForAccount(accountId: string): Promise<TerritoryAccountAssignment[]>;
  create(input: TerritoryAssignmentInput): Promise<TerritoryAccountAssignment>;
  /**
   * Apply a validated status transition, deriving the SCD end-date / current
   * flag. The caller checks the transition is legal first.
   */
  setStatus(
    record: TerritoryAccountAssignment,
    status: AssignmentStatus
  ): Promise<TerritoryAccountAssignment>;
  delete(id: string): Promise<void>;
}
