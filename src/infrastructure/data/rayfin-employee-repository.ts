/**
 * {@link EmployeeRepository} adapter over `client.data.Employee`. Owns the field
 * projection and actor/temporal stamping; audit logging is the use case's
 * responsibility, so this adapter depends only on {@link ActorContext}.
 */
import type { ActorContext } from '@/domain/ports/actor-context';
import type {
  EmployeeInput,
  EmployeeRepository,
} from '@/domain/repositories/employee-repository';
import type { Employee } from '@/domain/types';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

/** Keep in sync with rayfin/data/Employee.ts. */
const EMPLOYEE_FIELDS = [
  'id',
  'personnelNumber',
  'alias',
  'upn',
  'email',
  'entraObjectId',
  'displayName',
  'localName',
  'jobTitle',
  'roleTypeCode',
  'countryCode',
  'officeLocation',
  'employmentStatus',
  'isActive',
  'validFrom',
  'validTo',
  'currentFlag',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
] as const;

export class RayfinEmployeeRepository implements EmployeeRepository {
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly actor: ActorContext
  ) {}

  private get entity() {
    return this.client.data.Employee;
  }

  async list(): Promise<Employee[]> {
    const rows = await this.entity.select(EMPLOYEE_FIELDS).execute();
    return [...rows].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  getById(id: string): Promise<Employee | null> {
    return this.entity
      .select(EMPLOYEE_FIELDS)
      .where({ id: { eq: id } })
      .findFirst();
  }

  async create(input: EmployeeInput): Promise<Employee> {
    const now = new Date();
    const created = await this.entity.create({
      ...input,
      isActive: input.isActive ?? true,
      validFrom: now,
      currentFlag: true,
      createdBy: this.actor.actorId(),
      updatedBy: this.actor.actorId(),
      createdAt: now,
      updatedAt: now,
    });
    // Guarantee the caller's audit entry has a display name even if the create
    // response omits unselected fields.
    return { ...created, displayName: input.displayName } as Employee;
  }

  update(id: string, input: EmployeeInput): Promise<Employee> {
    return this.entity.update(
      { id },
      {
        ...input,
        isActive: input.isActive ?? true,
        updatedBy: this.actor.actorId(),
        updatedAt: new Date(),
      }
    );
  }

  setActive(id: string, isActive: boolean): Promise<Employee> {
    return this.entity.update(
      { id },
      { isActive, updatedBy: this.actor.actorId(), updatedAt: new Date() }
    );
  }
}
