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
 * Single role master (AE, CE, CSAM, the various SE / Specialist tracks …).
 *
 * Roles are data, never columns: a new role for FY27 is a new `Role` row, not a
 * schema change. `code` is the stable business key referenced by both
 * {@link Employee.roleTypeCode} (a person's home role) and
 * {@link TerritoryRoleAssignment.roleTypeCode} (the role a seat is staffed as).
 *
 * The four organizational dimensions (`orgUnit`, `solutionArea`, `subArea`,
 * `roleFamily`) describe where a role sits in the org/coverage taxonomy. They
 * are open governed buckets validated against ReferenceValue, not enums.
 */
@entity()
@authenticated('*')
export class Role {
  @uuid() id!: string;

  /** Business key, e.g. 'AE', 'CSAM', 'CLOUD_AI_DATA_SE'. */
  @text({ max: 64, unique: true }) code!: string;

  @text({ max: 200 }) name!: string;

  /** Open governed bucket: Sales, Technical, Solution Engineer, Specialist … */
  @text({ max: 128, optional: true }) category?: string;

  @text({ max: 1000, optional: true }) description?: string;

  /** Org unit the role belongs to (e.g. 'STU', 'CSU', 'GPS'). */
  @text({ max: 128, optional: true }) orgUnit?: string;
  /** Solution area (e.g. 'Apps & Infra', 'Data & AI', 'Modern Work'). */
  @text({ max: 128, optional: true }) solutionArea?: string;
  /** Finer sub-area within the solution area. */
  @text({ max: 128, optional: true }) subArea?: string;
  /** Role family grouping (e.g. 'Sales', 'Technical', 'Specialist', 'Management'). */
  @text({ max: 128, optional: true }) roleFamily?: string;

  /** Can this role be attached to an account-level assignment? */
  @boolean() isAccountAssignable!: boolean;
  /** Can this role own/anchor a territory (e.g. POD lead)? */
  @boolean() isTerritoryAssignable!: boolean;

  @int({ optional: true }) sortOrder?: number;
  @boolean() isActive!: boolean;

  @text({ max: 120, optional: true }) createdBy?: string;
  @date() createdAt!: Date;
}
