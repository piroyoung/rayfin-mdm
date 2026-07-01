/**
 * {@link ChangeRequestRepository} adapter over `client.data.ChangeRequest`. Owns
 * the field projection, payload truncation, and actor stamping; moving the
 * target record and audit logging are the stewardship use case's responsibility.
 */
import type { ActorContext } from '@/domain/ports/actor-context';
import type {
  ChangeRequestDecision,
  ChangeRequestInput,
  ChangeRequestRepository,
} from '@/domain/repositories/change-request-repository';
import type { ChangeRequest } from '@/domain/types';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

/**
 * Explicit field projection — the Rayfin/DAB client returns only the primary key
 * unless fields are selected. Keep in sync with rayfin/data/ChangeRequest.ts.
 */
const CHANGE_REQUEST_FIELDS = [
  'id',
  'domain',
  'changeType',
  'recordId',
  'recordLabel',
  'payload',
  'mergeTargetId',
  'status',
  'reason',
  'reviewNote',
  'requestedBy',
  'reviewedBy',
  'createdAt',
  'decidedAt',
] as const;

export class RayfinChangeRequestRepository
  implements ChangeRequestRepository
{
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly actor: ActorContext
  ) {}

  private get entity() {
    return this.client.data.ChangeRequest;
  }

  async list(): Promise<ChangeRequest[]> {
    const rows = await this.entity.select(CHANGE_REQUEST_FIELDS).execute();
    return [...rows].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
    );
  }

  create(input: ChangeRequestInput): Promise<ChangeRequest> {
    return this.entity.create({
      domain: input.domain,
      changeType: input.changeType,
      recordId: input.recordId,
      recordLabel: input.recordLabel?.slice(0, 200),
      payload:
        input.payload == null
          ? undefined
          : JSON.stringify(input.payload).slice(0, 4000),
      mergeTargetId: input.mergeTargetId,
      status: 'open',
      reason: input.reason?.slice(0, 1000),
      requestedBy: this.actor.actorId(),
      createdAt: new Date(),
    });
  }

  async decide(id: string, decision: ChangeRequestDecision): Promise<void> {
    await this.entity.update(
      { id },
      {
        status: decision.status,
        reviewedBy: this.actor.actorId(),
        reviewNote: decision.reviewNote?.slice(0, 1000),
        decidedAt: new Date(),
      }
    );
  }
}
