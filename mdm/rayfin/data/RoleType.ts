import {
  entity,
  authenticated,
  uuid,
  text,
  int,
  boolean,
  date,
} from '@microsoft/rayfin-core';

/**
 * Assignment role master (AE, CE, CSAM, the various SE / Specialist tracks …).
 *
 * Roles are data, never columns: a new role for FY27 is a new `RoleType` row,
 * not a schema change. `code` is the stable business key referenced by
 * {@link AccountEmployeeAssignment.roleTypeCode}.
 */
@entity()
@authenticated('*')
export class RoleType {
  @uuid() id!: string;

  /** Business key, e.g. 'AE', 'CSAM', 'CLOUD_AI_DATA_SE'. */
  @text({ max: 64, unique: true }) code!: string;

  @text({ max: 200 }) name!: string;

  /** Open governed bucket: Sales, Technical, Solution Engineer, Specialist … */
  @text({ max: 128, optional: true }) category?: string;

  @text({ max: 1000, optional: true }) description?: string;

  /** Can this role be attached to an account-employee assignment? */
  @boolean() isAccountAssignable!: boolean;
  /** Can this role own/anchor a territory (e.g. POD lead)? */
  @boolean() isTerritoryAssignable!: boolean;

  @int({ optional: true }) sortOrder?: number;
  @boolean() isActive!: boolean;

  @text({ max: 120, optional: true }) createdBy?: string;
  @date() createdAt!: Date;
}
