/**
 * Stewardship workflow. A change request is the approval ticket that gates a
 * proposed master-data change. Submitting one moves the target record to
 * `pending_approval`; approving it applies the change (promote to golden, or
 * archive); rejecting it sends the record back to `rejected`.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import { getCustomer, setCustomerStatus } from '@/services/customers';
import { getProduct, setProductStatus } from '@/services/products';
import type {
  ChangeRequest,
  ChangeType,
  MasterDomain,
} from '@/domain/types';

export interface ChangeRequestInput {
  domain: MasterDomain;
  changeType: ChangeType;
  recordId?: string;
  recordLabel?: string;
  /** Snapshot of proposed field values, shown to the reviewer. */
  payload?: unknown;
  mergeTargetId?: string;
  reason?: string;
}

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

/** Raise a change request and move the target record to `pending_approval`. */
export async function submitChangeRequest(
  input: ChangeRequestInput
): Promise<ChangeRequest> {
  const created = await changeRequests().create({
    domain: input.domain,
    changeType: input.changeType,
    recordId: input.recordId,
    recordLabel: input.recordLabel?.slice(0, 200),
    payload:
      input.payload == null
        ? undefined
        : JSON.stringify(input.payload).slice(0, 4000),
    mergeTargetId: input.mergeTargetId,
    status: 'open',
    reason: input.reason?.slice(0, 1000),
    requestedBy: actorId(),
    createdAt: new Date(),
  });

  if (input.recordId) {
    await moveTarget(input.domain, input.recordId, 'pending_approval');
  }
  await logAudit({
    domain: 'change_request',
    action: 'submit',
    recordId: created.id,
    recordLabel: input.recordLabel,
    summary: `Submitted ${input.changeType} request for ${input.domain}`,
    details: input.reason,
  });
  return created;
}

async function moveTarget(
  domain: MasterDomain,
  recordId: string,
  status: 'approved' | 'rejected' | 'archived' | 'pending_approval',
  note?: string
): Promise<void> {
  if (domain === 'customer') {
    const record = await getCustomer(recordId);
    if (record) await setCustomerStatus(record, status, note);
  } else {
    const record = await getProduct(recordId);
    if (record) await setProductStatus(record, status, note);
  }
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
