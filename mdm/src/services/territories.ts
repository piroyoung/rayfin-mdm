/** Territory master service: CRUD plus manager/parent cycle awareness. */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import { wouldCreateCycle, type HierarchyNode } from '@/domain/hierarchy';
import type { Territory } from '@/domain/types';

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

function territories() {
  return getRayfinClient().data.Territory;
}

/** Keep in sync with rayfin/data/Territory.ts. */
const TERRITORY_FIELDS = [
  'id',
  'territoryCode',
  'territoryName',
  'territoryType',
  'parentTerritoryId',
  'fiscalYearId',
  'segmentCode',
  'industryCode',
  'region',
  'countryCode',
  'isActive',
  'validFrom',
  'validTo',
  'currentFlag',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
] as const;

export async function listTerritories(): Promise<Territory[]> {
  const rows = await territories().select(TERRITORY_FIELDS).execute();
  return [...rows].sort((a, b) =>
    a.territoryCode.localeCompare(b.territoryCode)
  );
}

export function getTerritory(id: string): Promise<Territory | null> {
  return territories()
    .select(TERRITORY_FIELDS)
    .where({ id: { eq: id } })
    .findFirst();
}

export async function createTerritory(
  input: TerritoryInput
): Promise<Territory> {
  const now = new Date();
  const created = await territories().create({
    ...input,
    isActive: input.isActive ?? true,
    validFrom: now,
    currentFlag: true,
    createdBy: actorId(),
    updatedBy: actorId(),
    createdAt: now,
    updatedAt: now,
  });
  await logAudit({
    domain: 'territory',
    action: 'create',
    recordId: created.id,
    recordLabel: input.territoryCode,
    summary: `Created territory ${input.territoryCode}`,
  });
  return created;
}

export async function updateTerritory(
  id: string,
  input: TerritoryInput
): Promise<Territory> {
  if (input.parentTerritoryId) {
    const existing = await listTerritories();
    const nodes: HierarchyNode[] = existing.map((t) => ({
      id: t.id,
      parentId: t.parentTerritoryId,
    }));
    if (wouldCreateCycle(nodes, id, input.parentTerritoryId)) {
      throw new Error('A territory cannot be its own ancestor.');
    }
  }
  const updated = await territories().update(
    { id },
    {
      ...input,
      isActive: input.isActive ?? true,
      updatedBy: actorId(),
      updatedAt: new Date(),
    }
  );
  await logAudit({
    domain: 'territory',
    action: 'update',
    recordId: id,
    recordLabel: input.territoryCode,
    summary: `Updated territory ${input.territoryCode}`,
  });
  return updated;
}

export async function setTerritoryActive(
  record: Territory,
  isActive: boolean
): Promise<Territory> {
  const updated = await territories().update(
    { id: record.id },
    { isActive, updatedBy: actorId(), updatedAt: new Date() }
  );
  await logAudit({
    domain: 'territory',
    action: 'status_change',
    recordId: record.id,
    recordLabel: record.territoryCode,
    summary: `Territory ${record.territoryCode} → ${isActive ? 'active' : 'inactive'}`,
  });
  return updated;
}
