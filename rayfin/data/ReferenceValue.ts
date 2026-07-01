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
 * Reference / lookup data (code lists such as country, currency, industry,
 * product category). `parentId` enables simple hierarchies, resolved
 * client-side. Governed code lists are a core MDM capability.
 */
@entity()
@authenticated('*')
export class ReferenceValue {
  @uuid() id!: string;

  /** Logical list name, e.g. 'country', 'currency', 'industry', 'segment'. */
  @text({ max: 64 }) setName!: string;

  @text({ max: 64 }) code!: string;
  @text({ max: 160 }) label!: string;

  /** Optional hierarchy parent (another ReferenceValue id). */
  @uuid({ optional: true }) parentId?: string;

  @int({ optional: true }) sortOrder?: number;
  @boolean() isActive!: boolean;

  @text({ max: 120, optional: true }) createdBy?: string;
  @date() createdAt!: Date;
}
