/**
 * Stewardship workflow — backlog shim (approval queue).
 *
 * The submit-for-approval path now lives in `usecase/stewardship/
 * submit-change-request.ts` behind the {@link ChangeRequestRepository} +
 * {@link AccountRepository} ports and is consumed by the migrated Accounts
 * screen. This file stays for the not-yet-migrated Stewardship and Dashboard
 * pages (list/approve/reject) and re-exports the canonical input type from the
 * port so there is no drift.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import { getAccount, setAccountStatus } from '@/services/accounts';
import type { ChangeRequest, MasterDomain } from '@/domain/types';

export type { ChangeRequestInput } from '@/domain/repositories/change-request-repository';

function changeRequests() {
  return getRayfinClient().data.ChangeRequest;
}

/**
 * Explicit field projection — the Rayfin/DAB client returns only the primary key
 * unless fields are selected. Keep in sync with rayfin/data/ChangeRequest.ts.
 */
const CHANGE_REQUEST_FIELDS = [
  'id',
  'domain',
  'changeType',
  'recordId',
  'recordLabel',
  'payload',
  'mergeTargetId',
  'status',
  'reason',
  'reviewNote',
  'requestedBy',
  'reviewedBy',
  'createdAt',
  'decidedAt',
] as const;

export async function listChangeRequests(): Promise<ChangeRequest[]> {
  const rows = await changeRequests().select(CHANGE_REQUEST_FIELDS).execute();
  return [...rows].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );
}

async function moveTarget(
  domain: MasterDomain,
  recordId: string,
  status: 'approved' | 'rejected' | 'archived' | 'pending_approval',
  note?: string
): Promise<void> {
  void domain; // single master domain (account) today; kept for future domains
  const record = await getAccount(recordId);
  if (record) await setAccountStatus(record, status, note);
}

/** Approve a request: apply its effect to the target record, mark it applied. */
export async function approveChangeRequest(
  request: ChangeRequest,
  note?: string
): Promise<void> {
  if (request.recordId) {
    const targetStatus =
      request.changeType === 'archive' ? 'archived' : 'approved';
    await moveTarget(request.domain, request.recordId, targetStatus, note);
  }
  await changeRequests().update(
    { id: request.id },
    {
      status: 'applied',
      reviewedBy: actorId(),
      reviewNote: note?.slice(0, 1000),
      decidedAt: new Date(),
    }
  );
  await logAudit({
    domain: 'change_request',
    action: 'approve',
    recordId: request.id,
    recordLabel: request.recordLabel,
    summary: `Approved ${request.changeType} request`,
    details: note,
  });
}

export async function rejectChangeRequest(
  request: ChangeRequest,
  note?: string
): Promise<void> {
  if (request.recordId) {
    await moveTarget(request.domain, request.recordId, 'rejected', note);
  }
  await changeRequests().update(
    { id: request.id },
    {
      status: 'rejected',
      reviewedBy: actorId(),
      reviewNote: note?.slice(0, 1000),
      decidedAt: new Date(),
    }
  );
  await logAudit({
    domain: 'change_request',
    action: 'reject',
    recordId: request.id,
    recordLabel: request.recordLabel,
    summary: `Rejected ${request.changeType} request`,
    details: note,
  });
}
