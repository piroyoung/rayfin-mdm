/** Immutable audit trail: append-only writes + a sorted reader. */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import type { AuditAction, AuditDomain, AuditEvent } from '@/domain/types';

export interface AuditInput {
  domain: AuditDomain;
  action: AuditAction;
  recordId?: string;
  recordLabel?: string;
  summary?: string;
  details?: unknown;
}

function audit() {
  return getRayfinClient().data.AuditEvent;
}

/**
 * Explicit field projection — the Rayfin/DAB client returns only the primary key
 * unless fields are selected. Keep in sync with rayfin/data/AuditEvent.ts.
 */
const AUDIT_FIELDS = [
  'id',
  'domain',
  'action',
  'recordId',
  'recordLabel',
  'summary',
  'details',
  'actor',
  'createdAt',
] as const;

/** Best-effort: a failed audit write must never block the primary mutation. */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await audit().create({
      domain: input.domain,
      action: input.action,
      recordId: input.recordId,
      recordLabel: input.recordLabel?.slice(0, 200),
      summary: input.summary?.slice(0, 300),
      details:
        input.details == null
          ? undefined
          : (typeof input.details === 'string'
              ? input.details
              : JSON.stringify(input.details)
            ).slice(0, 4000),
      actor: actorId(),
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('Audit log write failed', err);
  }
}

export async function listAudit(): Promise<AuditEvent[]> {
  const rows = await audit().select(AUDIT_FIELDS).execute();
  return [...rows].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );
}
