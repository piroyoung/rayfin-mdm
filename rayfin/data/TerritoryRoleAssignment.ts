import {
  entity,
  authenticated,
  uuid,
  text,
  set,
  boolean,
  date,
} from '@microsoft/rayfin-core';

/**
 * Canonical role coverage: who staffs a given role in a given territory, for a
 * given fiscal year. This is the real operating unit — each territory has
 * exactly ONE member per role per fiscal year ("one seat per role"). An
 * account's team is then *derived* by joining the account to its territory and
 * reading that territory's roster, instead of storing people on every account.
 *
 * The single-seat invariant (one current row per territory/role/fiscal-year) is
 * enforced in the application + quality layer. SCD-Type-2 fields keep the
 * history of who held each seat.
 */
@entity()
@authenticated('*')
export class TerritoryRoleAssignment {
  @uuid() id!: string;

  @uuid() territoryId!: string;
  @uuid() employeeId!: string;
  @uuid() fiscalYearId!: string;

  /** References {@link Role.code} — the stable role business key. */
  @text({ max: 64 }) roleTypeCode!: string;

  @set('draft', 'submitted', 'approved', 'active', 'retired')
  assignmentStatus!: 'draft' | 'submitted' | 'approved' | 'active' | 'retired';

  @date() startDate!: Date;
  @date({ optional: true }) endDate?: Date;
  @boolean() currentFlag!: boolean;

  @text({ max: 64, optional: true }) sourceSystem?: string;
  @text({ max: 128, optional: true }) sourceRecordId?: string;

  @text({ max: 120, optional: true }) createdBy?: string;
  @text({ max: 120, optional: true }) updatedBy?: string;
  @date() createdAt!: Date;
  @date() updatedAt!: Date;
}
