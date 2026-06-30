import {
  entity,
  authenticated,
  uuid,
  text,
  boolean,
  date,
} from '@microsoft/rayfin-core';

/**
 * Cross-reference between an MDM record and its identifier in a source system
 * (CRM Account ID, MSSalesAccountID, HR ID, Excel row …).
 *
 * Keeps external IDs *out* of the MDM primary keys: source IDs can change,
 * merge or split without disturbing the stable surrogate MDM id they point at.
 */
@entity()
@authenticated('*')
export class SourceXref {
  @uuid() id!: string;

  /** Which MDM entity this maps (account, employee, territory …). */
  @text({ max: 64 }) mdmEntityType!: string;
  @uuid() mdmEntityId!: string;

  @text({ max: 64 }) sourceSystem!: string;
  @text({ max: 64, optional: true }) sourceEntityType?: string;
  @text({ max: 255 }) sourceRecordId!: string;
  @text({ max: 255, optional: true }) sourceRecordName?: string;

  @date() validFrom!: Date;
  @date({ optional: true }) validTo?: Date;
  @boolean() currentFlag!: boolean;

  @date() createdAt!: Date;
  @date() updatedAt!: Date;
}
