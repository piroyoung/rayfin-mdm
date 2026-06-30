import {
  entity,
  authenticated,
  uuid,
  text,
  set,
  date,
} from '@microsoft/rayfin-core';

/**
 * Immutable audit trail entry. Every create / update / status change / merge
 * across the master-data domains appends one of these for full traceability.
 */
@entity()
@authenticated('*')
export class AuditEvent {
  @uuid() id!: string;

  /**
   * Domain tag for the audited record. Stored as free text (not a narrow
   * `@set`) because the audit trail is immutable and append-only: it must
   * preserve domain tags from prior schema generations (e.g. legacy master
   * domains) without a CHECK-constraint migration rejecting historical rows.
   */
  @text({ max: 32 })
  domain!:
    | 'account'
    | 'reference'
    | 'change_request'
    | 'employee'
    | 'territory'
    | 'territory_role'
    | 'fiscal_year'
    | 'role'
    | 'assignment'
    | 'source_xref'
    | 'data_quality';

  @set(
    'create',
    'update',
    'delete',
    'approve',
    'reject',
    'merge',
    'status_change',
    'submit'
  )
  action!:
    | 'create'
    | 'update'
    | 'delete'
    | 'approve'
    | 'reject'
    | 'merge'
    | 'status_change'
    | 'submit';

  @uuid({ optional: true }) recordId?: string;
  @text({ max: 200, optional: true }) recordLabel?: string;

  /** Short human-readable description of what happened. */
  @text({ max: 300, optional: true }) summary?: string;

  /** JSON diff / extra detail. */
  @text({ max: 4000, optional: true }) details?: string;

  @text({ max: 120, optional: true }) actor?: string;
  @date() createdAt!: Date;
}
