/**
 * {@link AccountRepository} adapter over `client.data.Account`. Owns the field
 * projection, quality scoring, and actor/temporal stamping; audit logging is the
 * use case's responsibility, so this adapter depends only on {@link ActorContext}.
 */
import { scoreAccount } from '@/domain/quality';
import type { ActorContext } from '@/domain/ports/actor-context';
import type {
  AccountInput,
  AccountRepository,
} from '@/domain/repositories/account-repository';
import type { Account, RecordStatus } from '@/domain/types';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

/**
 * Explicit field projection — the Rayfin/DAB client returns only the primary key
 * unless fields are selected. Keep in sync with rayfin/data/Account.ts.
 */
const ACCOUNT_FIELDS = [
  'id',
  'accountNumber',
  'nameLegal',
  'nameDisplay',
  'nameLocal',
  'parentAccountId',
  'globalParentAccountId',
  'msSalesAccountId',
  'crmAccountId',
  'industryCode',
  'verticalCode',
  'subVerticalCode',
  'verticalCategoryCode',
  'segmentCode',
  'subSegmentCode',
  'countryCode',
  'region',
  'prefecture',
  'city',
  'sourceSystem',
  'isActive',
  'validFrom',
  'validTo',
  'currentFlag',
  'status',
  'isGolden',
  'qualityScore',
  'mergedIntoId',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
] as const;

export class RayfinAccountRepository implements AccountRepository {
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly actor: ActorContext
  ) {}

  private get entity() {
    return this.client.data.Account;
  }

  async list(): Promise<Account[]> {
    const rows = await this.entity.select(ACCOUNT_FIELDS).execute();
    return [...rows].sort(
      (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
    );
  }

  getById(id: string): Promise<Account | null> {
    return this.entity
      .select(ACCOUNT_FIELDS)
      .where({ id: { eq: id } })
      .findFirst();
  }

  async create(input: AccountInput): Promise<Account> {
    const now = new Date();
    const created = await this.entity.create({
      ...input,
      status: 'draft',
      isGolden: false,
      qualityScore: scoreAccount(input).score,
      isActive: true,
      validFrom: now,
      currentFlag: true,
      createdBy: this.actor.actorId(),
      updatedBy: this.actor.actorId(),
      createdAt: now,
      updatedAt: now,
    });
    // Guarantee the caller's audit label has the identifying fields even if the
    // create response omits unselected columns.
    return {
      ...created,
      accountNumber: input.accountNumber,
      nameLegal: input.nameLegal,
      nameDisplay: input.nameDisplay,
    } as Account;
  }

  update(id: string, input: AccountInput): Promise<Account> {
    return this.entity.update(
      { id },
      {
        ...input,
        qualityScore: scoreAccount(input).score,
        updatedBy: this.actor.actorId(),
        updatedAt: new Date(),
      }
    );
  }

  setStatus(id: string, status: RecordStatus): Promise<Account> {
    return this.entity.update(
      { id },
      {
        status,
        isGolden: status === 'approved',
        updatedBy: this.actor.actorId(),
        updatedAt: new Date(),
      }
    );
  }

  async merge(winnerId: string, loserIds: string[]): Promise<void> {
    for (const loserId of loserIds) {
      if (loserId === winnerId) continue;
      await this.entity.update(
        { id: loserId },
        {
          status: 'merged',
          isGolden: false,
          currentFlag: false,
          isActive: false,
          mergedIntoId: winnerId,
          updatedBy: this.actor.actorId(),
          updatedAt: new Date(),
        }
      );
    }
    await this.entity.update(
      { id: winnerId },
      {
        status: 'approved',
        isGolden: true,
        updatedBy: this.actor.actorId(),
        updatedAt: new Date(),
      }
    );
  }

  async delete(id: string): Promise<void> {
    await this.entity.delete({ id });
  }
}
