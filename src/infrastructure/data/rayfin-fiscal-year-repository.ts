/**
 * {@link FiscalYearRepository} adapter over `client.data.FiscalYear`. Owns the
 * field projection, actor stamping, and the "set current" flag reconciliation;
 * audit logging is the use case's responsibility, so this adapter depends only
 * on {@link ActorContext}.
 */
import type { ActorContext } from '@/domain/ports/actor-context';
import type {
  FiscalYearInput,
  FiscalYearRepository,
} from '@/domain/repositories/fiscal-year-repository';
import type { FiscalYear } from '@/domain/types';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

/** Keep in sync with rayfin/data/FiscalYear.ts. */
const FISCAL_YEAR_FIELDS = [
  'id',
  'code',
  'name',
  'startDate',
  'endDate',
  'isCurrent',
  'isPlanningYear',
  'sortOrder',
  'createdBy',
  'createdAt',
] as const;

export class RayfinFiscalYearRepository implements FiscalYearRepository {
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly actor: ActorContext
  ) {}

  private get entity() {
    return this.client.data.FiscalYear;
  }

  async list(): Promise<FiscalYear[]> {
    const rows = await this.entity.select(FISCAL_YEAR_FIELDS).execute();
    return [...rows].sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.code.localeCompare(b.code)
    );
  }

  getById(id: string): Promise<FiscalYear | null> {
    return this.entity
      .select(FISCAL_YEAR_FIELDS)
      .where({ id: { eq: id } })
      .findFirst();
  }

  async create(input: FiscalYearInput): Promise<FiscalYear> {
    const created = await this.entity.create({
      code: input.code,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      isCurrent: input.isCurrent ?? false,
      isPlanningYear: input.isPlanningYear ?? false,
      sortOrder: input.sortOrder,
      createdBy: this.actor.actorId(),
      createdAt: new Date(),
    });
    return { ...created, code: input.code, name: input.name } as FiscalYear;
  }

  update(id: string, input: FiscalYearInput): Promise<FiscalYear> {
    return this.entity.update(
      { id },
      {
        code: input.code,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        isCurrent: input.isCurrent ?? false,
        isPlanningYear: input.isPlanningYear ?? false,
        sortOrder: input.sortOrder,
      }
    );
  }

  async setCurrent(id: string): Promise<void> {
    const all = await this.list();
    for (const fy of all) {
      const shouldBeCurrent = fy.id === id;
      if (fy.isCurrent === shouldBeCurrent) continue;
      await this.entity.update({ id: fy.id }, { isCurrent: shouldBeCurrent });
    }
  }
}
