/**
 * Outbound port for the immutable audit trail. Every master-data mutation
 * appends one entry; the adapter stamps the actor and truncates fields at the
 * boundary. Implemented in `src/infrastructure/data/rayfin-audit-log.ts`.
 */
import type { AuditAction, AuditDomain, AuditEvent } from '@/domain/types';

export interface AuditEntry {
  domain: AuditDomain;
  action: AuditAction;
  recordId?: string;
  recordLabel?: string;
  summary?: string;
  details?: unknown;
}

export interface AuditLog {
  /** Append one audit entry. Failures must never block the primary mutation. */
  log(entry: AuditEntry): Promise<void>;

  /** All audit events, newest first. */
  list(): Promise<AuditEvent[]>;
}
