/**
 * Stewardship workflow — backlog shim (approval queue read model).
 *
 * The submit-for-approval and approve / reject decision paths now live in
 * `usecase/stewardship/` behind the {@link ChangeRequestRepository} +
 * {@link AccountRepository} ports and drive the migrated Accounts and
 * Stewardship screens. This file stays only for the not-yet-migrated Dashboard
 * page, which reads the change-request queue, and re-exports the canonical input
 * type from the port so there is no drift.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import type { ChangeRequest } from '@/domain/types';

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
