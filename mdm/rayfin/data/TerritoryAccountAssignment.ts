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
 * Bridge: which territory an account belongs to in a given fiscal year.
 *
 * FY25 and FY26 territory are *separate rows*, not two columns on the account —
 * that is what lets "did this account move territory?" be derived instead of
 * stored. SCD-Type-2 fields keep the history of moves.
 */
@entity()
@authenticated('*')
export class TerritoryAccountAssignment {
  @uuid() id!: string;

  /** Account.id (the master account record). */
  @uuid() accountId!: string;
  @uuid() territoryId!: string;
  @uuid() fiscalYearId!: string;

  @text({ max: 64, optional: true }) assignmentType?: string;

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
