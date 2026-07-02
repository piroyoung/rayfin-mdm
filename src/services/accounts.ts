/**
 * Legacy account service — backlog shim.
 *
 * Migrated screens use {@link AccountRepository} through the DI graph. This file
 * stays only for not-yet-migrated consumers (dashboard, assignments/territory
 * pages, dataQuality/seed/ingest services, the stewardship service, and the
 * projection test). It re-exports the canonical type and pure rules from the
 * domain so there is no drift, and keeps the CRUD/lifecycle functions bound to
 * the bootstrap client until each consumer migrates.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import { scoreAccount } from '@/domain/quality';
import { accountLabel, accountName } from '@/domain/models/account';
import type { AccountInput } from '@/domain/repositories/account-repository';
import type { Account, RecordStatus } from '@/domain/types';

export type { AccountInput } from '@/domain/repositories/account-repository';
export { accountName } from '@/domain/models/account';

function accounts() {
  return getRayfinClient().data.Account;
}

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

export async function listAccounts(): Promise<Account[]> {
  const rows = await accounts().select(ACCOUNT_FIELDS).execute();
  return [...rows].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
  );
}

export function getAccount(id: string): Promise<Account | null> {
  return accounts()
    .select(ACCOUNT_FIELDS)
    .where({ id: { eq: id } })
    .findFirst();
}

export async function createAccount(input: AccountInput): Promise<Account> {
  const now = new Date();
  const quality = scoreAccount(input).score;
  const created = await accounts().create({
    ...input,
    status: 'draft',
    isGolden: false,
    qualityScore: quality,
    isActive: true,
    validFrom: now,
    currentFlag: true,
    createdBy: actorId(),
    updatedBy: actorId(),
    createdAt: now,
    updatedAt: now,
  });
  await logAudit({
    domain: 'account',
    action: 'create',
    recordId: created.id,
    recordLabel: accountLabel(input),
    summary: `Created account ${accountName(input)}`,
  });
  return created;
}

export async function updateAccount(
  id: string,
  input: AccountInput
): Promise<Account> {
  const quality = scoreAccount(input).score;
  const updated = await accounts().update(
    { id },
    {
      ...input,
      qualityScore: quality,
      updatedBy: actorId(),
      updatedAt: new Date(),
    }
  );
  await logAudit({
    domain: 'account',
    action: 'update',
    recordId: id,
    recordLabel: accountLabel(input),
    summary: `Updated account ${accountName(input)}`,
  });
  return updated;
}

/** Move an account through its lifecycle; approval promotes it to golden. */
export async function setAccountStatus(
  record: Account,
  status: RecordStatus,
  note?: string
): Promise<Account> {
  const isGolden = status === 'approved';
  const updated = await accounts().update(
    { id: record.id },
    { status, isGolden, updatedBy: actorId(), updatedAt: new Date() }
  );
  const action =
    status === 'pending_approval'
      ? 'submit'
      : status === 'approved'
        ? 'approve'
        : status === 'rejected'
          ? 'reject'
          : 'status_change';
  await logAudit({
    domain: 'account',
    action,
    recordId: record.id,
    recordLabel: accountLabel(record),
    summary: `Account ${accountName(record)} → ${status}`,
    details: note,
  });
  return updated;
}

/**
 * Survivorship merge: each loser is flagged `merged` and pointed at the winner,
 * which becomes the approved golden record.
 */
export async function mergeAccounts(
  winner: Account,
  losers: Account[]
): Promise<void> {
  for (const loser of losers) {
    if (loser.id === winner.id) continue;
    await accounts().update(
      { id: loser.id },
      {
        status: 'merged',
        isGolden: false,
        currentFlag: false,
        isActive: false,
        mergedIntoId: winner.id,
        updatedBy: actorId(),
        updatedAt: new Date(),
      }
    );
    await logAudit({
      domain: 'account',
      action: 'merge',
      recordId: loser.id,
      recordLabel: accountLabel(loser),
      summary: `Merged ${accountName(loser)} into ${accountName(winner)}`,
      details: { winnerId: winner.id, winnerNumber: winner.accountNumber },
    });
  }
  await accounts().update(
    { id: winner.id },
    {
      status: 'approved',
      isGolden: true,
      updatedBy: actorId(),
      updatedAt: new Date(),
    }
  );
}

export async function deleteAccount(record: Account): Promise<void> {
  await accounts().delete({ id: record.id });
  await logAudit({
    domain: 'account',
    action: 'delete',
    recordId: record.id,
    recordLabel: accountLabel(record),
    summary: `Deleted account ${accountName(record)}`,
  });
}
