import {
  entity,
  authenticated,
  uuid,
  text,
  set,
  date,
} from '@microsoft/rayfin-core';

/**
 * Stewardship change request — the approval workflow that gates whether a
 * proposed master-data change becomes the golden record.
 *
 * Polymorphic by design: `domain` + `recordId` point at the target master
 * record (Customer or Product) without a typed FK, because a single workflow
 * must span multiple domains.
 */
@entity()
@authenticated('*')
export class ChangeRequest {
  @uuid() id!: string;

  @set('customer', 'product') domain!: 'customer' | 'product';

  @set('create', 'update', 'merge', 'archive')
  changeType!: 'create' | 'update' | 'merge' | 'archive';

  /** Target master record id (absent for brand-new-record requests). */
  @uuid({ optional: true }) recordId?: string;

  /** Human-friendly snapshot label of the affected record. */
  @text({ max: 200, optional: true }) recordLabel?: string;

  /** JSON snapshot of the proposed field values. */
  @text({ max: 4000, optional: true }) payload?: string;

  /** For merge requests: the surviving golden record id. */
  @uuid({ optional: true }) mergeTargetId?: string;

  @set('open', 'approved', 'rejected', 'applied')
  status!: 'open' | 'approved' | 'rejected' | 'applied';

  @text({ max: 1000, optional: true }) reason?: string;
  @text({ max: 1000, optional: true }) reviewNote?: string;

  @text({ max: 120, optional: true }) requestedBy?: string;
  @text({ max: 120, optional: true }) reviewedBy?: string;

  @date() createdAt!: Date;
  @date({ optional: true }) decidedAt?: Date;
}
