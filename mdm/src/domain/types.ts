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
import type { Account } from '../../rayfin/data/Account';
import type { ReferenceValue } from '../../rayfin/data/ReferenceValue';
import type { FiscalYear } from '../../rayfin/data/FiscalYear';
import type { Role } from '../../rayfin/data/Role';
import type { Employee } from '../../rayfin/data/Employee';
import type { Territory } from '../../rayfin/data/Territory';
import type { TerritoryAccountAssignment } from '../../rayfin/data/TerritoryAccountAssignment';
import type { TerritoryRoleAssignment } from '../../rayfin/data/TerritoryRoleAssignment';
import type { SourceXref } from '../../rayfin/data/SourceXref';
import type { DataQualityIssue } from '../../rayfin/data/DataQualityIssue';

export type { AuditEvent, ChangeRequest, Account, ReferenceValue };
export type {
  FiscalYear,
  Role,
  Employee,
  Territory,
  TerritoryAccountAssignment,
  TerritoryRoleAssignment,
  SourceXref,
  DataQualityIssue,
};

/** Lifecycle shared by every master record. */
export type RecordStatus = Account['status'];
export type MasterDomain = ChangeRequest['domain'];
export type ChangeType = ChangeRequest['changeType'];
export type ChangeStatus = ChangeRequest['status'];
export type AuditDomain = AuditEvent['domain'];
export type AuditAction = AuditEvent['action'];

// ── Territory-assignment MDM enums (derived from the entity classes) ──
export type AssignmentStatus = TerritoryRoleAssignment['assignmentStatus'];
export type IssueSeverity = DataQualityIssue['severity'];
export type ResolutionStatus = DataQualityIssue['resolutionStatus'];

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

export const SEGMENT_META: Record<string, Labelled> = {
  enterprise: { label: 'Enterprise' },
  corporate: { label: 'Corporate' },
  smb: { label: 'SMB' },
  consumer: { label: 'Consumer' },
  public_sector: { label: 'Public sector' },
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
  account: { label: 'Account' },
};

/** Assignment lifecycle: draft → submitted → approved → active → retired. */
export const ASSIGNMENT_STATUS_META: Record<AssignmentStatus, Toned> = {
  draft: { label: 'Draft', tone: 'gray' },
  submitted: { label: 'Submitted', tone: 'amber' },
  approved: { label: 'Approved', tone: 'blue' },
  active: { label: 'Active', tone: 'green' },
  retired: { label: 'Retired', tone: 'slate' },
};

export const SEVERITY_META: Record<IssueSeverity, Toned> = {
  low: { label: 'Low', tone: 'gray' },
  medium: { label: 'Medium', tone: 'amber' },
  high: { label: 'High', tone: 'red' },
  critical: { label: 'Critical', tone: 'red' },
};

export const RESOLUTION_STATUS_META: Record<ResolutionStatus, Toned> = {
  open: { label: 'Open', tone: 'amber' },
  in_progress: { label: 'In progress', tone: 'blue' },
  resolved: { label: 'Resolved', tone: 'green' },
  dismissed: { label: 'Dismissed', tone: 'slate' },
};

/** Known data-quality rule codes (open set — unknown codes fall back via humanize). */
export const ISSUE_TYPE_META: Record<string, Labelled> = {
  MISSING_ACCOUNT_ID: { label: 'Missing account ID' },
  DUPLICATE_ACCOUNT: { label: 'Duplicate account candidate' },
  UNKNOWN_EMPLOYEE: { label: 'Unknown employee' },
  INACTIVE_EMPLOYEE_ASSIGNED: { label: 'Inactive employee assigned' },
  INVALID_TERRITORY: { label: 'Invalid territory' },
  MULTIPLE_TERRITORY_ROLE_MEMBER: { label: 'Multiple members in a territory seat' },
  MULTIPLE_TERRITORY_PER_ACCOUNT: { label: 'Account in multiple territories' },
  ROLE_MISMATCH: { label: 'Assigned role differs from home role' },
  INVALID_REFERENCE_VALUE: { label: 'Invalid reference value' },
  FY_DATE_MISMATCH: { label: 'Fiscal-year date mismatch' },
  PARENT_CYCLE: { label: 'Parent hierarchy cycle' },
  ALIAS_AMBIGUOUS: { label: 'Ambiguous alias' },
};

/** `assignmentStatus` values that are safe to publish downstream. */
export const PUBLISHABLE_ASSIGNMENT_STATUSES: ReadonlySet<AssignmentStatus> =
  new Set<AssignmentStatus>(['approved', 'active']);

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
