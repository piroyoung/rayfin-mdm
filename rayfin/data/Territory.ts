import {
  entity,
  authenticated,
  uuid,
  text,
  boolean,
  date,
} from '@microsoft/rayfin-core';

/**
 * Territory / POD / sales-unit master. Codes such as `JPN.SMECC.RTL.0303` and
 * `Japan POD #03` live here. Territory structure can change year over year, so
 * a territory is scoped to a `fiscalYearId` and carries SCD-Type-2 history.
 *
 * `territoryCode` is unique *within a fiscal year*, not globally — that rule is
 * enforced in the application/quality layer, not as a DB constraint.
 *
 * Territory ownership is not stored on the row: it is derived from the seats in
 * {@link TerritoryRoleAssignment} (the owner is whoever holds the owning role /
 * role-family, e.g. POD lead), so there is no direct Employee⇔Territory link.
 */
@entity()
@authenticated('*')
export class Territory {
  @uuid() id!: string;

  @text({ max: 128 }) territoryCode!: string;
  @text({ max: 255 }) territoryName!: string;

  /** Open governed bucket (POD, SALES_TERRITORY, SEGMENT …). */
  @text({ max: 64, optional: true }) territoryType?: string;
  @uuid({ optional: true }) parentTerritoryId?: string;

  @uuid({ optional: true }) fiscalYearId?: string;
  @text({ max: 64, optional: true }) segmentCode?: string;
  @text({ max: 64, optional: true }) industryCode?: string;
  @text({ max: 64, optional: true }) region?: string;
  @text({ max: 2, optional: true }) countryCode?: string;

  @boolean() isActive!: boolean;

  @date() validFrom!: Date;
  @date({ optional: true }) validTo?: Date;
  @boolean() currentFlag!: boolean;

  @text({ max: 120, optional: true }) createdBy?: string;
  @text({ max: 120, optional: true }) updatedBy?: string;
  @date() createdAt!: Date;
  @date() updatedAt!: Date;
}
