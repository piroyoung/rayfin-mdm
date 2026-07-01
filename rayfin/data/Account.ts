import {
  entity,
  authenticated,
  uuid,
  text,
  set,
  int,
  boolean,
  date,
} from '@microsoft/rayfin-core';

/**
 * Account master record (`mdm_account`) — the customer company / account itself.
 *
 * Per the FY26 Territory Assignment MDM design, the account carries no
 * territory, fiscal-year or ownership columns: those live in the assignment
 * bridges so they can vary by year and be historised. External system IDs
 * (MSSales, CRM) are mirrored here for lineage but are never the primary key —
 * `id` is an MDM surrogate. Industry / vertical / segment are reference-coded.
 *
 * Shared across all authenticated data stewards — Rayfin/Fabric only supports
 * the built-in `authenticated` role, so domain-level roles (steward, approver,
 * viewer) are enforced in the application layer, not the database.
 */
@entity()
@authenticated('*')
export class Account {
  @uuid() id!: string;

  /** Business key — the single authoritative account number for this record. */
  @text({ max: 64, unique: true }) accountNumber!: string;

  /** Legal entity name (authoritative). */
  @text({ max: 255 }) nameLegal!: string;
  /** Display / common name. */
  @text({ max: 255, optional: true }) nameDisplay?: string;
  /** Local-language name. */
  @text({ max: 255, optional: true }) nameLocal?: string;

  // ── Hierarchy ──
  @uuid({ optional: true }) parentAccountId?: string;
  @uuid({ optional: true }) globalParentAccountId?: string;

  // ── External IDs (lineage only — mirrored in SourceXref, never PKs) ──
  /** External sales account id (MSSalesAccountID). */
  @text({ max: 128, optional: true }) msSalesAccountId?: string;
  /** External CRM account id. */
  @text({ max: 128, optional: true }) crmAccountId?: string;

  // ── Reference-coded classification ──
  @text({ max: 64, optional: true }) industryCode?: string;
  @text({ max: 64, optional: true }) verticalCode?: string;
  @text({ max: 64, optional: true }) subVerticalCode?: string;
  @text({ max: 64, optional: true }) verticalCategoryCode?: string;
  @text({ max: 64, optional: true }) segmentCode?: string;
  @text({ max: 64, optional: true }) subSegmentCode?: string;

  // ── Geography ──
  @text({ max: 2, optional: true }) countryCode?: string;
  @text({ max: 64, optional: true }) region?: string;
  @text({ max: 64, optional: true }) prefecture?: string;
  @text({ max: 128, optional: true }) city?: string;

  /** Provenance: originating source system for lineage. */
  @text({ max: 64, optional: true }) sourceSystem?: string;

  // ── Validity / SCD2 ──
  @boolean() isActive!: boolean;
  @date() validFrom!: Date;
  @date({ optional: true }) validTo?: Date;
  @boolean() currentFlag!: boolean;

  // ── Stewardship / golden-record machinery (application layer) ──
  /** Stewardship lifecycle / golden-record state. */
  @set('draft', 'pending_approval', 'approved', 'rejected', 'archived', 'merged')
  status!:
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'rejected'
    | 'archived'
    | 'merged';

  /** True once this record is the approved single source of truth. */
  @boolean() isGolden!: boolean;

  /** Computed 0-100 data-quality score, persisted on each save. */
  @int({ optional: true }) qualityScore?: number;

  /** Survivorship: id of the golden record this duplicate was merged into. */
  @uuid({ optional: true }) mergedIntoId?: string;

  @text({ max: 120, optional: true }) createdBy?: string;
  @text({ max: 120, optional: true }) updatedBy?: string;
  @date() createdAt!: Date;
  @date() updatedAt!: Date;
}
