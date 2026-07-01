/**
 * {@link AuditLog} adapter over `client.data.AuditEvent`. Stamps the current
 * actor from {@link ActorContext} and truncates free-text fields at the write
 * boundary. Reads come back newest-first.
 */
import type { ActorContext } from '@/domain/ports/actor-context';
import type { AuditEntry, AuditLog } from '@/domain/ports/audit-log';
import type { AuditEvent } from '@/domain/types';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

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

export class RayfinAuditLog implements AuditLog {
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly actor: ActorContext
  ) {}

  private get entity() {
    return this.client.data.AuditEvent;
  }

  /** Best-effort: a failed audit write must never block the primary mutation. */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.entity.create({
        domain: entry.domain,
        action: entry.action,
        recordId: entry.recordId,
        recordLabel: entry.recordLabel?.slice(0, 200),
        summary: entry.summary?.slice(0, 300),
        details:
          entry.details == null
            ? undefined
            : (typeof entry.details === 'string'
                ? entry.details
                : JSON.stringify(entry.details)
              ).slice(0, 4000),
        actor: this.actor.actorId(),
        createdAt: new Date(),
      });
    } catch (err) {
      console.error('Audit log write failed', err);
    }
  }

  async list(): Promise<AuditEvent[]> {
    const rows = await this.entity.select(AUDIT_FIELDS).execute();
    return [...rows].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
    );
  }
}
