/** Pure projections, labels, and audit-metadata rules for the account master. */
import type { AccountInput } from '@/domain/repositories/account-repository';
import {
  isActiveStatus,
  type Account,
  type AuditAction,
  type RecordStatus,
} from '@/domain/types';

/** Best display name for an account: common name, else legal name. */
export function accountName(record: {
  nameDisplay?: string;
  nameLegal: string;
}): string {
  return record.nameDisplay?.trim() || record.nameLegal;
}

/** Audit/record label: `ACC-1001 — Contoso`. */
export function accountLabel(record: {
  accountNumber: string;
  nameDisplay?: string;
  nameLegal: string;
}): string {
  return `${record.accountNumber} — ${accountName(record)}`;
}

/** Project a stored row back to its steward-editable input shape. */
export function accountSnapshot(a: Account): AccountInput {
  return {
    accountNumber: a.accountNumber,
    nameLegal: a.nameLegal,
    nameDisplay: a.nameDisplay,
    nameLocal: a.nameLocal,
    parentAccountId: a.parentAccountId,
    globalParentAccountId: a.globalParentAccountId,
    msSalesAccountId: a.msSalesAccountId,
    crmAccountId: a.crmAccountId,
    industryCode: a.industryCode,
    verticalCode: a.verticalCode,
    subVerticalCode: a.subVerticalCode,
    verticalCategoryCode: a.verticalCategoryCode,
    segmentCode: a.segmentCode,
    subSegmentCode: a.subSegmentCode,
    countryCode: a.countryCode,
    region: a.region,
    prefecture: a.prefecture,
    city: a.city,
    sourceSystem: a.sourceSystem,
  };
}

/** Map a lifecycle transition to the audit action that records it. */
export function accountStatusAction(status: RecordStatus): AuditAction {
  return status === 'pending_approval'
    ? 'submit'
    : status === 'approved'
      ? 'approve'
      : status === 'rejected'
        ? 'reject'
        : 'status_change';
}

// Lifecycle action gates — which row actions a status allows. The view reads
// these predicates instead of re-deriving rules from status literals.

/** A merged record is frozen; everything else is editable. */
export function canEditAccount(status: RecordStatus): boolean {
  return status !== 'merged';
}

/** Only drafts and rejected records can be (re)submitted for approval. */
export function canSubmitAccount(status: RecordStatus): boolean {
  return status === 'draft' || status === 'rejected';
}

/** Only approved golden records can be archived. */
export function canArchiveAccount(status: RecordStatus): boolean {
  return status === 'approved';
}

/** Hard delete is allowed only for active, not-yet-in-approval records. */
export function canDeleteAccount(status: RecordStatus): boolean {
  return (
    isActiveStatus(status) &&
    status !== 'approved' &&
    status !== 'pending_approval'
  );
}
