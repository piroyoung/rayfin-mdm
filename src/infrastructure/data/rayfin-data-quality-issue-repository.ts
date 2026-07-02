/**
 * {@link DataQualityIssueRepository} adapter over `client.data.DataQualityIssue`.
 * Owns the field projection, the severity-then-recency ordering, and the
 * closing (resolvedAt / resolvedBy) stamping. Audit logging is the use case's
 * responsibility, so this adapter depends only on {@link ActorContext}.
 */
import type { ActorContext } from '@/domain/ports/actor-context';
import type {
  DataQualityIssueInput,
  DataQualityIssueRepository,
} from '@/domain/repositories/data-quality-issue-repository';
import type {
  DataQualityIssue,
  IssueSeverity,
  ResolutionStatus,
} from '@/domain/types';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

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

export class RayfinDataQualityIssueRepository
  implements DataQualityIssueRepository
{
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly actor: ActorContext
  ) {}

  private get entity() {
    return this.client.data.DataQualityIssue;
  }

  async list(): Promise<DataQualityIssue[]> {
    const rows = await this.entity.select(ISSUE_FIELDS).execute();
    return [...rows].sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        +new Date(b.detectedAt) - +new Date(a.detectedAt)
    );
  }

  create(input: DataQualityIssueInput): Promise<DataQualityIssue> {
    return this.entity.create({
      ...input,
      detectedAt: new Date(),
      resolutionStatus: 'open',
    });
  }

  setResolution(
    record: DataQualityIssue,
    status: ResolutionStatus,
    comment?: string
  ): Promise<DataQualityIssue> {
    const closing = status === 'resolved' || status === 'dismissed';
    return this.entity.update(
      { id: record.id },
      {
        resolutionStatus: status,
        resolutionComment: comment,
        resolvedAt: closing ? new Date() : undefined,
        resolvedBy: closing ? this.actor.actorId() : undefined,
      }
    );
  }
}
