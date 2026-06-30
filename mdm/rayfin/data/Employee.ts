import {
  entity,
  authenticated,
  uuid,
  text,
  email,
  boolean,
  date,
} from '@microsoft/rayfin-core';

/**
 * Employee / sales-team-member master. The person, not their account coverage —
 * which territory seats a person holds lives in {@link TerritoryRoleAssignment},
 * never on the employee row.
 *
 * `roleTypeCode` is the person's *home* role (the role they are normally staffed
 * as, e.g. an AE). It is a default/identity attribute; the authoritative role
 * for a given seat is the one on the assignment, so a person can still cover a
 * different role in a specific territory.
 *
 * Self-references its manager via `managerEmployeeId`. SCD-Type-2 history is
 * carried by validFrom / validTo / currentFlag.
 */
@entity()
@authenticated('*')
export class Employee {
  @uuid() id!: string;

  @text({ max: 64, optional: true }) personnelNumber?: string;

  /** Short login alias as it appears in source workbooks (e.g. 'HMIZUKAMI'). */
  @text({ max: 128, optional: true }) alias?: string;
  @text({ max: 255, optional: true }) upn?: string;
  @email({ optional: true }) email?: string;

  @text({ max: 255 }) displayName!: string;
  @text({ max: 255, optional: true }) localName?: string;

  @text({ max: 255, optional: true }) jobTitle?: string;
  @text({ max: 128, optional: true }) roleFamily?: string;

  /** Home role — references {@link RoleType.code}. The person's default role. */
  @text({ max: 64, optional: true }) roleTypeCode?: string;

  @uuid({ optional: true }) organizationUnitId?: string;
  @uuid({ optional: true }) managerEmployeeId?: string;

  @text({ max: 2, optional: true }) countryCode?: string;
  @text({ max: 128, optional: true }) officeLocation?: string;

  /** HR status text (Active, Leave, Terminated …). `isActive` is the flag. */
  @text({ max: 64, optional: true }) employmentStatus?: string;
  @boolean() isActive!: boolean;

  @date() validFrom!: Date;
  @date({ optional: true }) validTo?: Date;
  @boolean() currentFlag!: boolean;

  @text({ max: 120, optional: true }) createdBy?: string;
  @text({ max: 120, optional: true }) updatedBy?: string;
  @date() createdAt!: Date;
  @date() updatedAt!: Date;
}
