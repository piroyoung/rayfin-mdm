/**
 * Change-request persistence port. A change request is the approval ticket that
 * gates a proposed master-data change. The Rayfin-backed implementation lives in
 * `src/infrastructure/data/`; target-record moves and audit logging are the
 * stewardship use case's responsibility.
 */
import type { ChangeRequest, ChangeType, MasterDomain } from '@/domain/types';

export interface ChangeRequestInput {
  domain: MasterDomain;
  changeType: ChangeType;
  recordId?: string;
  recordLabel?: string;
  /** Snapshot of proposed field values, shown to the reviewer. */
  payload?: unknown;
  mergeTargetId?: string;
  reason?: string;
}

/** Reviewer decision applied to a change request. */
export interface ChangeRequestDecision {
  status: 'applied' | 'rejected';
  reviewNote?: string;
}

export interface ChangeRequestRepository {
  /** All change requests, newest first. */
  list(): Promise<ChangeRequest[]>;
  /** Raise a new change request in the `open` state. */
  create(input: ChangeRequestInput): Promise<ChangeRequest>;
  /** Record the reviewer decision on a change request. */
  decide(id: string, decision: ChangeRequestDecision): Promise<void>;
}
