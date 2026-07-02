/**
 * {@link TerritoryAccountAssignmentRepository} adapter over
 * `client.data.TerritoryAccountAssignment`. Owns the field projection, the
 * SCD end-date / current-flag derivation, and actor/temporal stamping; audit
 * logging is the use case's responsibility, so this adapter depends only on
 * {@link ActorContext}.
 */
import type { ActorContext } from '@/domain/ports/actor-context';
import type {
  TerritoryAccountAssignmentRepository,
  TerritoryAssignmentInput,
} from '@/domain/repositories/territory-account-assignment-repository';
import type {
  AssignmentStatus,
  TerritoryAccountAssignment,
} from '@/domain/types';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

/**
 * Explicit field projection — the Rayfin/DAB client returns only the primary key
 * unless fields are selected. Keep in sync with
 * rayfin/data/TerritoryAccountAssignment.ts.
 */
const TERRITORY_ASSIGNMENT_FIELDS = [
  'id',
  'accountId',
  'territoryId',
  'fiscalYearId',
  'assignmentType',
  'assignmentStatus',
  'startDate',
  'endDate',
  'currentFlag',
  'sourceSystem',
  'sourceRecordId',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
] as const;

export class RayfinTerritoryAccountAssignmentRepository
  implements TerritoryAccountAssignmentRepository
{
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly actor: ActorContext
  ) {}

  private get entity() {
    return this.client.data.TerritoryAccountAssignment;
  }

  async list(): Promise<TerritoryAccountAssignment[]> {
    return [
      ...(await this.entity.select(TERRITORY_ASSIGNMENT_FIELDS).execute()),
    ];
  }

  listForAccount(accountId: string): Promise<TerritoryAccountAssignment[]> {
    return this.entity
      .select(TERRITORY_ASSIGNMENT_FIELDS)
      .where({ accountId: { eq: accountId } })
      .execute()
      .then((rows) => [...rows]);
  }

  create(
    input: TerritoryAssignmentInput
  ): Promise<TerritoryAccountAssignment> {
    const now = new Date();
    return this.entity.create({
      accountId: input.accountId,
      territoryId: input.territoryId,
      fiscalYearId: input.fiscalYearId,
      assignmentType: input.assignmentType,
      assignmentStatus: input.assignmentStatus ?? 'draft',
      startDate: input.startDate ?? now,
      currentFlag: true,
      sourceSystem: input.sourceSystem,
      sourceRecordId: input.sourceRecordId,
      createdBy: this.actor.actorId(),
      updatedBy: this.actor.actorId(),
      createdAt: now,
      updatedAt: now,
    });
  }

  setStatus(
    record: TerritoryAccountAssignment,
    status: AssignmentStatus
  ): Promise<TerritoryAccountAssignment> {
    return this.entity.update(
      { id: record.id },
      {
        assignmentStatus: status,
        endDate: status === 'retired' ? new Date() : record.endDate,
        currentFlag: status !== 'retired',
        updatedBy: this.actor.actorId(),
        updatedAt: new Date(),
      }
    );
  }

  async delete(id: string): Promise<void> {
    await this.entity.delete({ id });
  }
}
