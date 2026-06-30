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
 * Fiscal-year dimension (FY26, FY27 …). Years are explicit master rows so
 * assignments and territories can be scoped by year without baking the year
 * into the dependent records' attributes.
 */
@entity()
@authenticated('*')
export class FiscalYear {
  @uuid() id!: string;

  /** Business key — the canonical short code, e.g. 'FY26'. */
  @text({ max: 16, unique: true }) code!: string;

  @text({ max: 64 }) name!: string;

  @date() startDate!: Date;
  @date() endDate!: Date;

  /** Exactly one row is normally the current operating year. */
  @boolean() isCurrent!: boolean;
  /** True while the year is still being planned (next-FY territory planning). */
  @boolean() isPlanningYear!: boolean;

  @int({ optional: true }) sortOrder?: number;

  @text({ max: 120, optional: true }) createdBy?: string;
  @date() createdAt!: Date;
}
