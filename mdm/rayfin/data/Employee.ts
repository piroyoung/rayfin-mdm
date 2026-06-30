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
 * Employee / sales-team-member master. The person, not their assignments — a
 * given person can be an AE this year and a manager the next, so their account
 * roles live in {@link AccountEmployeeAssignment}, never on the employee row.
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
