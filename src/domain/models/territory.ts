/** Pure projections and labels for the territory master. */
import type { TerritoryInput } from '@/domain/repositories/territory-repository';
import type { Territory } from '@/domain/types';

/** Audit/record label for a territory: its code. */
export function territoryLabel(record: { territoryCode: string }): string {
  return record.territoryCode;
}

/** Project a stored row back to its steward-editable input shape. */
export function territorySnapshot(t: Territory): TerritoryInput {
  return {
    territoryCode: t.territoryCode,
    territoryName: t.territoryName,
    territoryType: t.territoryType,
    parentTerritoryId: t.parentTerritoryId,
    fiscalYearId: t.fiscalYearId,
    segmentCode: t.segmentCode,
    industryCode: t.industryCode,
    region: t.region,
    countryCode: t.countryCode,
    isActive: t.isActive,
  };
}
