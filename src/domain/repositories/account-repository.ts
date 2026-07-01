/**
 * Account master-data persistence port. The app depends on this interface; the
 * Rayfin-backed implementation lives in `src/infrastructure/data/`. Stewardship
 * lifecycle (status transitions, survivorship merge) is modelled here as data
 * operations — audit logging is the use case's responsibility.
 */
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

export interface AccountRepository {
  /** All accounts, newest-updated first. */
  list(): Promise<Account[]>;
  getById(id: string): Promise<Account | null>;
  create(input: AccountInput): Promise<Account>;
  update(id: string, input: AccountInput): Promise<Account>;
  /** Move an account through its lifecycle; approval promotes it to golden. */
  setStatus(id: string, status: RecordStatus): Promise<Account>;
  /**
   * Survivorship merge: each loser is flagged `merged` and pointed at the
   * winner, which becomes the approved golden record.
   */
  merge(winnerId: string, loserIds: string[]): Promise<void>;
  delete(id: string): Promise<void>;
}
