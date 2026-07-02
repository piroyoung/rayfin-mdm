/** Pure derivations for the Accounts screen: search + status filtering. */
import type { Account, RecordStatus } from '@/domain/types';

export type StatusFilterValue = RecordStatus | 'all';

/** Filter the account list by the status dropdown and free-text search. */
export function filterAccounts(
  accounts: Account[],
  search: string,
  statusFilter: StatusFilterValue
): Account[] {
  const q = search.trim().toLowerCase();
  return accounts.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (!q) return true;
    return [
      a.accountNumber,
      a.nameLegal,
      a.nameDisplay,
      a.crmAccountId,
      a.msSalesAccountId,
      a.city,
    ]
      .filter(Boolean)
      .some((v) => v!.toLowerCase().includes(q));
  });
}
