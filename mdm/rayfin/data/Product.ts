import {
  entity,
  authenticated,
  uuid,
  text,
  set,
  decimal,
  int,
  boolean,
  date,
} from '@microsoft/rayfin-core';

/**
 * Product master record (a second managed master-data domain) — demonstrates
 * multi-domain MDM sharing the same stewardship, quality and audit machinery.
 */
@entity()
@authenticated('*')
export class Product {
  @uuid() id!: string;

  /** Business key — Stock Keeping Unit. */
  @text({ max: 40, unique: true }) sku!: string;

  @text({ max: 200 }) name!: string;
  @text({ max: 1000, optional: true }) description?: string;
  @text({ max: 80, optional: true }) category?: string;
  @text({ max: 80, optional: true }) brand?: string;

  /** Global Trade Item Number / barcode. */
  @text({ max: 64, optional: true }) gtin?: string;

  @set('each', 'kg', 'g', 'l', 'ml', 'box', 'case', 'pallet')
  unitOfMeasure!: 'each' | 'kg' | 'g' | 'l' | 'ml' | 'box' | 'case' | 'pallet';

  @decimal({ optional: true }) listPrice?: number;
  @text({ max: 3, optional: true }) currency?: string;

  @set('draft', 'pending_approval', 'approved', 'rejected', 'archived', 'merged')
  status!:
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'rejected'
    | 'archived'
    | 'merged';

  @boolean() isGolden!: boolean;
  @int({ optional: true }) qualityScore?: number;
  @text({ max: 64, optional: true }) sourceSystem?: string;
  @uuid({ optional: true }) mergedIntoId?: string;

  @text({ max: 120, optional: true }) createdBy?: string;
  @text({ max: 120, optional: true }) updatedBy?: string;
  @date() createdAt!: Date;
  @date() updatedAt!: Date;
}
