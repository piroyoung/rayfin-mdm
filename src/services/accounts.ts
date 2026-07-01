/**
 * Account master-data service: CRUD plus stewardship lifecycle transitions,
 * survivorship merge, and automatic quality scoring + audit logging.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import { scoreAccount } from '@/domain/quality';
import type { Account, RecordStatus } from '@/domain/types';

/** Steward-editable fields of an account (everything else is system-managed). */
export interface AccountInput {
  accountNumber: string;
  nameLegal: string;
  nameDisplay?: string;
  nameLocal?: string;
  // Hierarchy
  parentAccountId?: string;
  globalParentAccountId?: string;
  // External IDs (lineage)
  msSalesAccountId?: string;
  crmAccountId?: string;
  // Reference-coded classification
  industryCode?: string;
  verticalCode?: string;
  subVerticalCode?: string;
  verticalCategoryCode?: string;
  segmentCode?: string;
  subSegmentCode?: string;
  // Geography
  countryCode?: string;
  region?: string;
  prefecture?: string;
  city?: string;
  sourceSystem?: string;
}

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

/** Best display name for an account: common name, else legal name. */
export function accountName(record: {
  nameDisplay?: string;
  nameLegal: string;
}): string {
  return record.nameDisplay?.trim() || record.nameLegal;
}

function label(record: {
  accountNumber: string;
  nameDisplay?: string;
  nameLegal: string;
}): string {
  return `${record.accountNumber} — ${accountName(record)}`;
}

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
    recordLabel: label(input),
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
    recordLabel: label(input),
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
    recordLabel: label(record),
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
      recordLabel: label(loser),
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
    recordLabel: label(record),
    summary: `Deleted account ${accountName(record)}`,
  });
}
