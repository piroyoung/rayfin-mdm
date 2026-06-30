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
 * Bridge: who covers an account, in which role, for which fiscal year.
 *
 * This is the row-normalised replacement for the wide Excel role columns
 * (FY26_AE, FY26_CSAM, Copilot SE …). One row per (account, employee, role,
 * fiscal year). Multiple people in one role are multiple rows distinguished by
 * `isPrimary`. New roles never add columns — they add a `roleTypeCode` value.
 */
@entity()
@authenticated('*')
export class AccountEmployeeAssignment {
  @uuid() id!: string;

  /** Customer.id (the account). */
  @uuid() accountId!: string;
  @uuid() employeeId!: string;
  @uuid() fiscalYearId!: string;

  /** Optional territory context for this coverage row. */
  @uuid({ optional: true }) territoryId?: string;

  /** References {@link RoleType.code} — the stable role business key. */
  @text({ max: 64 }) roleTypeCode!: string;

  /** Primary (lead) owner for this account/role/fiscal-year. */
  @boolean() isPrimary!: boolean;

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
