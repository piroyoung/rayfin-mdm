/**
 * {@link TerritoryRoleAssignmentRepository} adapter over
 * `client.data.TerritoryRoleAssignment`. Owns the field projection, the
 * SCD-Type-2 seat swap mechanics (via the {@link planSeatReassignment} domain
 * plan), and actor/temporal stamping; the create-vs-swap decision, transition
 * legality, and audit logging are the use case's responsibility.
 */
import { planSeatReassignment } from '@/domain/territoryRoster';
import type { ActorContext } from '@/domain/ports/actor-context';
import type {
  TerritoryRoleAssignmentInput,
  TerritoryRoleAssignmentRepository,
} from '@/domain/repositories/territory-role-assignment-repository';
import type {
  AssignmentStatus,
  TerritoryRoleAssignment,
} from '@/domain/types';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

/**
 * Explicit field projection — the Rayfin/DAB client returns only the primary key
 * unless fields are selected. Keep in sync with
 * rayfin/data/TerritoryRoleAssignment.ts.
 */
const TERRITORY_ROLE_FIELDS = [
  'id',
  'territoryId',
  'employeeId',
  'fiscalYearId',
  'roleTypeCode',
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

export class RayfinTerritoryRoleAssignmentRepository
  implements TerritoryRoleAssignmentRepository
{
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly actor: ActorContext
  ) {}

  private get entity() {
    return this.client.data.TerritoryRoleAssignment;
  }

  async list(): Promise<TerritoryRoleAssignment[]> {
    return [...(await this.entity.select(TERRITORY_ROLE_FIELDS).execute())];
  }

  listForTerritory(
    territoryId: string,
    fiscalYearId?: string
  ): Promise<TerritoryRoleAssignment[]> {
    const where = fiscalYearId
      ? { territoryId: { eq: territoryId }, fiscalYearId: { eq: fiscalYearId } }
      : { territoryId: { eq: territoryId } };
    return this.entity
      .select(TERRITORY_ROLE_FIELDS)
      .where(where)
      .execute()
      .then((rows) => [...rows]);
  }

  create(
    input: TerritoryRoleAssignmentInput
  ): Promise<TerritoryRoleAssignment> {
    const now = new Date();
    return this.entity.create({
      territoryId: input.territoryId,
      employeeId: input.employeeId,
      fiscalYearId: input.fiscalYearId,
      roleTypeCode: input.roleTypeCode,
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

  async reassignSeat(
    holder: TerritoryRoleAssignment,
    newEmployeeId: string
  ): Promise<TerritoryRoleAssignment> {
    const now = new Date();
    const plan = planSeatReassignment(holder, newEmployeeId, now);
    await this.entity.update(
      { id: plan.retireId },
      { ...plan.retirePatch, updatedBy: this.actor.actorId(), updatedAt: now }
    );
    return this.entity.create({
      territoryId: plan.newRow.territoryId,
      employeeId: plan.newRow.employeeId,
      fiscalYearId: plan.newRow.fiscalYearId,
      roleTypeCode: plan.newRow.roleTypeCode,
      assignmentStatus: 'draft',
      startDate: plan.newRow.startDate,
      currentFlag: true,
      createdBy: this.actor.actorId(),
      updatedBy: this.actor.actorId(),
      createdAt: now,
      updatedAt: now,
    });
  }

  setStatus(
    record: TerritoryRoleAssignment,
    status: AssignmentStatus
  ): Promise<TerritoryRoleAssignment> {
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
