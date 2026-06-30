import {
  entity,
  authenticated,
  uuid,
  text,
  set,
  date,
} from '@microsoft/rayfin-core';

/**
 * Governance: a single detected data-quality problem (missing primary owner,
 * unknown employee, invalid territory, duplicate account candidate …).
 *
 * `issueType` is an open governed code (the catalogue of rules grows over time);
 * `severity` and `resolutionStatus` are closed lifecycle sets so they can drive
 * coloured badges and the steward triage queue.
 */
@entity()
@authenticated('*')
export class DataQualityIssue {
  @uuid() id!: string;

  @text({ max: 64 }) entityType!: string;
  @uuid({ optional: true }) entityId?: string;
  @text({ max: 64, optional: true }) sourceSystem?: string;
  @text({ max: 255, optional: true }) sourceRecordId?: string;

  /** Rule code, e.g. 'MULTIPLE_PRIMARY_OWNER', 'UNKNOWN_EMPLOYEE'. */
  @text({ max: 64 }) issueType!: string;

  @set('low', 'medium', 'high', 'critical')
  severity!: 'low' | 'medium' | 'high' | 'critical';

  @text({ max: 2000, optional: true }) description?: string;

  @date() detectedAt!: Date;
  @text({ max: 128, optional: true }) detectedByProcess?: string;

  @uuid({ optional: true }) ownerEmployeeId?: string;

  @set('open', 'in_progress', 'resolved', 'dismissed')
  resolutionStatus!: 'open' | 'in_progress' | 'resolved' | 'dismissed';

  @text({ max: 2000, optional: true }) resolutionComment?: string;
  @date({ optional: true }) resolvedAt?: Date;
  @text({ max: 120, optional: true }) resolvedBy?: string;
}
