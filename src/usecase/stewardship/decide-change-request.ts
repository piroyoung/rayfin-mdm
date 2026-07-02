/**
 * Change-request decision orchestration (approve / reject). Applying a decision
 * moves the target account to its resulting status, records the change-request
 * decision through the port, and writes both the account-status and
 * change-request audit entries. Dependencies are injected so this is reusable by
 * the Stewardship screen and any future reviewer surface.
 */
import {
  accountLabel,
  accountName,
  accountStatusAction,
} from '@/domain/models/account';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { ChangeRequestRepository } from '@/domain/repositories/change-request-repository';
import type { AuditLog } from '@/domain/ports/audit-log';
import type { ChangeRequest, RecordStatus } from '@/domain/types';

export interface DecideChangeRequestDeps {
  changeRequests: ChangeRequestRepository;
  accounts: AccountRepository;
  audit: AuditLog;
}

async function moveAccount(
  deps: DecideChangeRequestDeps,
  recordId: string,
  status: RecordStatus,
  note?: string
): Promise<void> {
  const record = await deps.accounts.getById(recordId);
  if (!record) return;
  await deps.accounts.setStatus(record.id, status);
  await deps.audit.log({
    domain: 'account',
    action: accountStatusAction(status),
    recordId: record.id,
    recordLabel: accountLabel(record),
    summary: `Account ${accountName(record)} → ${status}`,
    details: note,
  });
}

/** Approve a request: apply its effect to the target record, mark it applied. */
export async function approveChangeRequest(
  deps: DecideChangeRequestDeps,
  request: ChangeRequest,
  note?: string
): Promise<void> {
  if (request.recordId) {
    const targetStatus: RecordStatus =
      request.changeType === 'archive' ? 'archived' : 'approved';
    await moveAccount(deps, request.recordId, targetStatus, note);
  }
  await deps.changeRequests.decide(request.id, {
    status: 'applied',
    reviewNote: note,
  });
  await deps.audit.log({
    domain: 'change_request',
    action: 'approve',
    recordId: request.id,
    recordLabel: request.recordLabel,
    summary: `Approved ${request.changeType} request`,
    details: note,
  });
}

/** Reject a request: send the target record back and mark it rejected. */
export async function rejectChangeRequest(
  deps: DecideChangeRequestDeps,
  request: ChangeRequest,
  note?: string
): Promise<void> {
  if (request.recordId) {
    await moveAccount(deps, request.recordId, 'rejected', note);
  }
  await deps.changeRequests.decide(request.id, {
    status: 'rejected',
    reviewNote: note,
  });
  await deps.audit.log({
    domain: 'change_request',
    action: 'reject',
    recordId: request.id,
    recordLabel: request.recordLabel,
    summary: `Rejected ${request.changeType} request`,
    details: note,
  });
}
