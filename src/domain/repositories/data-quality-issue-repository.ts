/**
 * Persistence port for the data-quality triage queue. The detection rules that
 * populate the queue live in `@/domain/assignmentQuality`; this port owns the
 * storage + lifecycle (open → in_progress → resolved / dismissed). The Rayfin
 * adapter owns the field projection, the severity ordering, and the closing
 * (resolvedAt / resolvedBy) stamping; audit logging is the use case's job.
 */
import type {
  DataQualityIssue,
  IssueSeverity,
  ResolutionStatus,
} from '@/domain/types';

export interface DataQualityIssueInput {
  entityType: string;
  entityId?: string;
  sourceSystem?: string;
  sourceRecordId?: string;
  issueType: string;
  severity: IssueSeverity;
  description?: string;
  detectedByProcess?: string;
  ownerEmployeeId?: string;
}

export interface DataQualityIssueRepository {
  /** All issues, ordered by severity then most-recently-detected. */
  list(): Promise<DataQualityIssue[]>;
  /** Raise a new issue (detectedAt = now, status = open). */
  create(input: DataQualityIssueInput): Promise<DataQualityIssue>;
  /** Move an issue to a new resolution status, stamping closure when terminal. */
  setResolution(
    record: DataQualityIssue,
    status: ResolutionStatus,
    comment?: string
  ): Promise<DataQualityIssue>;
}
