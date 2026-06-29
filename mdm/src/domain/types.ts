/**
 * Domain model for the MDM app.
 *
 * The Rayfin entity classes in `rayfin/data/*` are the single source of truth
 * for the persisted shape. We re-export their instance types here so the React
 * layer never reaches into the backend project directly, and we derive the
 * enum/union types and their display metadata from those same classes.
 */
import type { AuditEvent } from '../../rayfin/data/AuditEvent';
import type { ChangeRequest } from '../../rayfin/data/ChangeRequest';
import type { Customer } from '../../rayfin/data/Customer';
import type { Product } from '../../rayfin/data/Product';
import type { ReferenceValue } from '../../rayfin/data/ReferenceValue';

export type { AuditEvent, ChangeRequest, Customer, Product, ReferenceValue };

/** Lifecycle shared by every master record (Customer + Product). */
export type RecordStatus = Customer['status'];
export type CustomerSegment = Customer['segment'];
export type UnitOfMeasure = Product['unitOfMeasure'];
export type MasterDomain = ChangeRequest['domain'];
export type ChangeType = ChangeRequest['changeType'];
export type ChangeStatus = ChangeRequest['status'];
export type AuditDomain = AuditEvent['domain'];
export type AuditAction = AuditEvent['action'];

export type BadgeTone =
  | 'gray'
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'purple'
  | 'slate'
  | 'indigo';

export interface Labelled {
  label: string;
}
export interface Toned extends Labelled {
  tone: BadgeTone;
}

export const RECORD_STATUS_META: Record<RecordStatus, Toned> = {
  draft: { label: 'Draft', tone: 'gray' },
  pending_approval: { label: 'Pending approval', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
  archived: { label: 'Archived', tone: 'slate' },
  merged: { label: 'Merged', tone: 'purple' },
};

export const SEGMENT_META: Record<CustomerSegment, Labelled> = {
  enterprise: { label: 'Enterprise' },
  corporate: { label: 'Corporate' },
  smb: { label: 'SMB' },
  consumer: { label: 'Consumer' },
  public_sector: { label: 'Public sector' },
};

export const UOM_META: Record<UnitOfMeasure, Labelled> = {
  each: { label: 'Each' },
  kg: { label: 'Kilogram (kg)' },
  g: { label: 'Gram (g)' },
  l: { label: 'Litre (L)' },
  ml: { label: 'Millilitre (mL)' },
  box: { label: 'Box' },
  case: { label: 'Case' },
  pallet: { label: 'Pallet' },
};

export const CHANGE_TYPE_META: Record<ChangeType, Labelled> = {
  create: { label: 'Create' },
  update: { label: 'Update' },
  merge: { label: 'Merge' },
  archive: { label: 'Archive' },
};

export const CHANGE_STATUS_META: Record<ChangeStatus, Toned> = {
  open: { label: 'Open', tone: 'amber' },
  approved: { label: 'Approved', tone: 'blue' },
  rejected: { label: 'Rejected', tone: 'red' },
  applied: { label: 'Applied', tone: 'green' },
};

export const AUDIT_ACTION_META: Record<AuditAction, Toned> = {
  create: { label: 'Create', tone: 'green' },
  update: { label: 'Update', tone: 'blue' },
  delete: { label: 'Delete', tone: 'red' },
  approve: { label: 'Approve', tone: 'green' },
  reject: { label: 'Reject', tone: 'red' },
  merge: { label: 'Merge', tone: 'purple' },
  status_change: { label: 'Status change', tone: 'slate' },
  submit: { label: 'Submit', tone: 'amber' },
};

export const MASTER_DOMAIN_META: Record<MasterDomain, Labelled> = {
  customer: { label: 'Customer' },
  product: { label: 'Product' },
};

/** Title-case an unknown enum token for a display fallback (`status_change` → `Status change`). */
export function humanizeToken(value: string | null | undefined): string {
  if (!value) return '—';
  const spaced = value.replace(/[_-]+/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : '—';
}

/**
 * Resolve display metadata for an enum value that *might* fall outside the
 * current union. The Fabric backend is persistent, so rows written under an
 * earlier schema can carry values we no longer model — looking them up
 * directly (`MAP[value].tone`) would throw during render and blank the whole
 * app. These accessors fall back to a neutral badge instead.
 */
export function tonedMeta<K extends string>(map: Record<K, Toned>, key: K): Toned {
  const hit = (map as Record<string, Toned | undefined>)[key];
  return hit ?? { label: humanizeToken(key), tone: 'gray' };
}

export function labelledMeta<K extends string>(
  map: Record<K, Labelled>,
  key: K
): Labelled {
  const hit = (map as Record<string, Labelled | undefined>)[key];
  return hit ?? { label: humanizeToken(key) };
}

/** Build `[value,label]` option pairs for a `<Select>` from a metadata map. */
export function optionsOf<K extends string>(
  meta: Record<K, Labelled>
): Array<{ value: K; label: string }> {
  return (Object.keys(meta) as K[]).map((value) => ({
    value,
    label: meta[value].label,
  }));
}

/** A master record is "active" when it participates in dedup / golden views. */
export function isActiveStatus(status: RecordStatus): boolean {
  return status !== 'merged' && status !== 'archived';
}
