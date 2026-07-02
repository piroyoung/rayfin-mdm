/**
 * Data-quality issue orchestration: raise issues and drive the triage lifecycle
 * (start → resolve / dismiss). Gates nothing itself beyond delegating the
 * closing stamp to the repository; these functions decide the audit action and
 * record the trail. Reused by the Data Quality screen and the ingest pipeline.
 */
import type { AuditLog } from '@/domain/ports/audit-log';
import type {
  DataQualityIssueInput,
  DataQualityIssueRepository,
} from '@/domain/repositories/data-quality-issue-repository';
import type { DataQualityIssue, ResolutionStatus } from '@/domain/types';

export interface QualityIssueDeps {
  dataQualityIssues: DataQualityIssueRepository;
  audit: AuditLog;
}

/** Raise a single issue and record it. */
export async function createIssue(
  deps: QualityIssueDeps,
  input: DataQualityIssueInput
): Promise<DataQualityIssue> {
  const created = await deps.dataQualityIssues.create(input);
  await deps.audit.log({
    domain: 'data_quality',
    action: 'create',
    recordId: created.id,
    recordLabel: input.issueType,
    summary: `Raised ${input.severity} issue ${input.issueType}`,
    details: { entityType: input.entityType, entityId: input.entityId },
  });
  return created;
}

/** Bulk-raise issues from a rule run; returns the number created. */
export async function createIssues(
  deps: QualityIssueDeps,
  inputs: DataQualityIssueInput[]
): Promise<number> {
  let count = 0;
  for (const input of inputs) {
    await createIssue(deps, input);
    count += 1;
  }
  return count;
}

async function setResolution(
  deps: QualityIssueDeps,
  record: DataQualityIssue,
  status: ResolutionStatus,
  comment?: string
): Promise<DataQualityIssue> {
  const updated = await deps.dataQualityIssues.setResolution(
    record,
    status,
    comment
  );
  await deps.audit.log({
    domain: 'data_quality',
    action: status === 'resolved' ? 'approve' : 'status_change',
    recordId: record.id,
    recordLabel: record.issueType,
    summary: `Issue ${record.issueType} → ${status}`,
    details: comment,
  });
  return updated;
}

/** Move an open issue into in-progress triage. */
export function startIssue(
  deps: QualityIssueDeps,
  record: DataQualityIssue
): Promise<DataQualityIssue> {
  return setResolution(deps, record, 'in_progress');
}

/** Close an issue as resolved with an optional steward note. */
export function resolveIssue(
  deps: QualityIssueDeps,
  record: DataQualityIssue,
  comment?: string
): Promise<DataQualityIssue> {
  return setResolution(deps, record, 'resolved', comment);
}

/** Close an issue as dismissed with an optional steward note. */
export function dismissIssue(
  deps: QualityIssueDeps,
  record: DataQualityIssue,
  comment?: string
): Promise<DataQualityIssue> {
  return setResolution(deps, record, 'dismissed', comment);
}
