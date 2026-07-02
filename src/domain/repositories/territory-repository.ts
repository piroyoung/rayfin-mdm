/**
 * Territory master-data persistence port. The app depends on this interface; the
 * Rayfin-backed implementation lives in `src/infrastructure/data/`. Parent-cycle
 * validation is a domain policy applied by the use case, and audit logging is the
 * use case's responsibility.
 */
import type { Territory } from '@/domain/types';

/** Steward-editable fields of a territory (everything else is system-managed). */
export interface TerritoryInput {
  territoryCode: string;
  territoryName: string;
  territoryType?: string;
  parentTerritoryId?: string;
  fiscalYearId?: string;
  segmentCode?: string;
  industryCode?: string;
  region?: string;
  countryCode?: string;
  isActive?: boolean;
}

export interface TerritoryRepository {
  /** All territories, ordered by code. */
  list(): Promise<Territory[]>;
  getById(id: string): Promise<Territory | null>;
  create(input: TerritoryInput): Promise<Territory>;
  update(id: string, input: TerritoryInput): Promise<Territory>;
  /** Activate or retire a territory. */
  setActive(id: string, isActive: boolean): Promise<Territory>;
}
