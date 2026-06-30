/**
 * Data-quality issue service: the steward triage queue. The detection *rules*
 * that populate this table live in Phase 4 (`@/domain/assignmentQuality`); this
 * module is the persistence + lifecycle (open → in_progress → resolved/dismissed).
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
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

function issues() {
  return getRayfinClient().data.DataQualityIssue;
}

/** Keep in sync with rayfin/data/DataQualityIssue.ts. */
const ISSUE_FIELDS = [
  'id',
  'entityType',
  'entityId',
  'sourceSystem',
  'sourceRecordId',
  'issueType',
  'severity',
  'description',
  'detectedAt',
  'detectedByProcess',
  'ownerEmployeeId',
  'resolutionStatus',
  'resolutionComment',
  'resolvedAt',
  'resolvedBy',
] as const;

const SEVERITY_RANK: Record<IssueSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export async function listDataQualityIssues(): Promise<DataQualityIssue[]> {
  const rows = await issues().select(ISSUE_FIELDS).execute();
  return [...rows].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      +new Date(b.detectedAt) - +new Date(a.detectedAt)
  );
}

/** Open + in-progress issues only — the active steward worklist. */
export async function listOpenDataQualityIssues(): Promise<DataQualityIssue[]> {
  const rows = await listDataQualityIssues();
  return rows.filter(
    (r) => r.resolutionStatus === 'open' || r.resolutionStatus === 'in_progress'
  );
}

export async function createDataQualityIssue(
  input: DataQualityIssueInput
): Promise<DataQualityIssue> {
  const created = await issues().create({
    ...input,
    detectedAt: new Date(),
    resolutionStatus: 'open',
  });
  await logAudit({
    domain: 'data_quality',
    action: 'create',
    recordId: created.id,
    recordLabel: input.issueType,
    summary: `Raised ${input.severity} issue ${input.issueType}`,
    details: { entityType: input.entityType, entityId: input.entityId },
  });
  return created;
}

/** Bulk insert from a rule run; returns the number created. */
export async function createDataQualityIssues(
  inputs: DataQualityIssueInput[]
): Promise<number> {
  let count = 0;
  for (const input of inputs) {
    await createDataQualityIssue(input);
    count += 1;
  }
  return count;
}

async function setResolution(
  record: DataQualityIssue,
  status: ResolutionStatus,
  comment?: string
): Promise<DataQualityIssue> {
  const closing = status === 'resolved' || status === 'dismissed';
  const updated = await issues().update(
    { id: record.id },
    {
      resolutionStatus: status,
      resolutionComment: comment,
      resolvedAt: closing ? new Date() : undefined,
      resolvedBy: closing ? actorId() : undefined,
    }
  );
  await logAudit({
    domain: 'data_quality',
    action: status === 'resolved' ? 'approve' : 'status_change',
    recordId: record.id,
    recordLabel: record.issueType,
    summary: `Issue ${record.issueType} → ${status}`,
    details: comment,
  });
  return updated;
}

export function startDataQualityIssue(
  record: DataQualityIssue
): Promise<DataQualityIssue> {
  return setResolution(record, 'in_progress');
}

export function resolveDataQualityIssue(
  record: DataQualityIssue,
  comment?: string
): Promise<DataQualityIssue> {
  return setResolution(record, 'resolved', comment);
}

export function dismissDataQualityIssue(
  record: DataQualityIssue,
  comment?: string
): Promise<DataQualityIssue> {
  return setResolution(record, 'dismissed', comment);
}
