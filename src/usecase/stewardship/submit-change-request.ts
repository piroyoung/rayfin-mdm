/**
 * Submit-for-approval orchestration. Raising a change request also moves the
 * target account to `pending_approval` and writes both the account-status and
 * change-request audit entries. Dependencies are injected as parameters so this
 * is reusable by the Accounts screen today and the Stewardship screen later.
 */
import {
  accountLabel,
  accountName,
  accountStatusAction,
} from '@/domain/models/account';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type {
  ChangeRequestInput,
  ChangeRequestRepository,
} from '@/domain/repositories/change-request-repository';
import type { AuditLog } from '@/domain/ports/audit-log';
import type { ChangeRequest } from '@/domain/types';

export interface SubmitChangeRequestDeps {
  changeRequests: ChangeRequestRepository;
  accounts: AccountRepository;
  audit: AuditLog;
}

/** Raise a change request and move the target record to `pending_approval`. */
export async function submitChangeRequest(
  deps: SubmitChangeRequestDeps,
  input: ChangeRequestInput
): Promise<ChangeRequest> {
  const created = await deps.changeRequests.create(input);

  if (input.recordId) {
    const record = await deps.accounts.getById(input.recordId);
    if (record) {
      await deps.accounts.setStatus(record.id, 'pending_approval');
      await deps.audit.log({
        domain: 'account',
        action: accountStatusAction('pending_approval'),
        recordId: record.id,
        recordLabel: accountLabel(record),
        summary: `Account ${accountName(record)} → pending_approval`,
      });
    }
  }

  await deps.audit.log({
    domain: 'change_request',
    action: 'submit',
    recordId: created.id,
    recordLabel: input.recordLabel,
    summary: `Submitted ${input.changeType} request for ${input.domain}`,
    details: input.reason,
  });
  return created;
}
