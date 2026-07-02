/**
 * Account write orchestration shared by the Accounts screen and the ingest
 * pipeline. The repository adapter owns the draft status, quality scoring, and
 * temporal stamping; this operation only records the audit trail.
 */
import { accountLabel, accountName } from '@/domain/models/account';
import type {
  AccountInput,
  AccountRepository,
} from '@/domain/repositories/account-repository';
import type { AuditLog } from '@/domain/ports/audit-log';
import type { Account } from '@/domain/types';

export interface AccountWriteDeps {
  accounts: AccountRepository;
  audit: AuditLog;
}

/** Create a new draft account and record it. */
export async function createAccount(
  deps: AccountWriteDeps,
  input: AccountInput
): Promise<Account> {
  const created = await deps.accounts.create(input);
  await deps.audit.log({
    domain: 'account',
    action: 'create',
    recordId: created.id,
    recordLabel: accountLabel(input),
    summary: `Created account ${accountName(input)}`,
  });
  return created;
}
