import {
  entity,
  authenticated,
  uuid,
  text,
  email,
  set,
  int,
  boolean,
  date,
} from '@microsoft/rayfin-core';

/**
 * Customer master record (a managed master-data domain).
 *
 * Shared across all authenticated data stewards — Rayfin/Fabric only supports
 * the built-in `authenticated` role, so domain-level roles (steward, approver,
 * viewer) are enforced in the application layer, not the database.
 */
@entity()
@authenticated('*')
export class Customer {
  @uuid() id!: string;

  /** Business key — the single authoritative code for this master record. */
  @text({ max: 32, unique: true }) customerCode!: string;

  @text({ max: 200 }) name!: string;
  @text({ max: 200, optional: true }) legalName?: string;
  @email({ optional: true }) email?: string;
  @text({ max: 40, optional: true }) phone?: string;
  @text({ max: 64, optional: true }) taxId?: string;
  @text({ max: 120, optional: true }) website?: string;

  @set('enterprise', 'corporate', 'smb', 'consumer', 'public_sector')
  segment!: 'enterprise' | 'corporate' | 'smb' | 'consumer' | 'public_sector';

  @text({ max: 80, optional: true }) industry?: string;

  @text({ max: 200, optional: true }) addressLine1?: string;
  @text({ max: 120, optional: true }) city?: string;
  @text({ max: 120, optional: true }) stateProvince?: string;
  @text({ max: 20, optional: true }) postalCode?: string;
  @text({ max: 2, optional: true }) countryCode?: string;

  // ── Account-master extensions (territory-assignment MDM) ──
  // Territory, fiscal year and ownership are intentionally NOT stored here —
  // they live in the assignment bridges so they can vary by year and be
  // historised. External IDs are mirrored in SourceXref, never used as PKs.

  /** External sales account id (MSSalesAccountID). */
  @text({ max: 128, optional: true }) msSalesAccountId?: string;
  /** External CRM account id. */
  @text({ max: 128, optional: true }) crmAccountId?: string;

  @uuid({ optional: true }) parentAccountId?: string;
  @uuid({ optional: true }) globalParentAccountId?: string;

  @text({ max: 64, optional: true }) verticalCode?: string;
  @text({ max: 64, optional: true }) subVerticalCode?: string;
  @text({ max: 64, optional: true }) verticalCategoryCode?: string;
  @text({ max: 64, optional: true }) subSegmentCode?: string;

  @text({ max: 64, optional: true }) region?: string;
  @text({ max: 120, optional: true }) prefecture?: string;

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

  /** Provenance: originating source system for lineage. */
  @text({ max: 64, optional: true }) sourceSystem?: string;

  /** Survivorship: id of the golden record this duplicate was merged into. */
  @uuid({ optional: true }) mergedIntoId?: string;

  @text({ max: 120, optional: true }) createdBy?: string;
  @text({ max: 120, optional: true }) updatedBy?: string;
  @date() createdAt!: Date;
  @date() updatedAt!: Date;
}
