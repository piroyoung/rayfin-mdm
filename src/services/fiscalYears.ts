/** Fiscal-year master service: CRUD + "set the current operating year". */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import type { FiscalYear } from '@/domain/types';

export type { FiscalYearInput } from '@/domain/repositories/fiscal-year-repository';
import type { FiscalYearInput } from '@/domain/repositories/fiscal-year-repository';

function fiscalYears() {
  return getRayfinClient().data.FiscalYear;
}

/** Keep in sync with rayfin/data/FiscalYear.ts. */
const FISCAL_YEAR_FIELDS = [
  'id',
  'code',
  'name',
  'startDate',
  'endDate',
  'isCurrent',
  'isPlanningYear',
  'sortOrder',
  'createdBy',
  'createdAt',
] as const;

export async function listFiscalYears(): Promise<FiscalYear[]> {
  const rows = await fiscalYears().select(FISCAL_YEAR_FIELDS).execute();
  return [...rows].sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.code.localeCompare(b.code)
  );
}

export function getFiscalYear(id: string): Promise<FiscalYear | null> {
  return fiscalYears()
    .select(FISCAL_YEAR_FIELDS)
    .where({ id: { eq: id } })
    .findFirst();
}

export async function createFiscalYear(
  input: FiscalYearInput
): Promise<FiscalYear> {
  const created = await fiscalYears().create({
    code: input.code,
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    isCurrent: input.isCurrent ?? false,
    isPlanningYear: input.isPlanningYear ?? false,
    sortOrder: input.sortOrder,
    createdBy: actorId(),
    createdAt: new Date(),
  });
  await logAudit({
    domain: 'fiscal_year',
    action: 'create',
    recordId: created.id,
    recordLabel: input.code,
    summary: `Created fiscal year ${input.code}`,
  });
  return created;
}

export async function updateFiscalYear(
  id: string,
  input: FiscalYearInput
): Promise<FiscalYear> {
  const updated = await fiscalYears().update(
    { id },
    {
      code: input.code,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      isCurrent: input.isCurrent ?? false,
      isPlanningYear: input.isPlanningYear ?? false,
      sortOrder: input.sortOrder,
    }
  );
  await logAudit({
    domain: 'fiscal_year',
    action: 'update',
    recordId: id,
    recordLabel: input.code,
    summary: `Updated fiscal year ${input.code}`,
  });
  return updated;
}

/** Mark one fiscal year current and clear the flag on every other row. */
export async function setCurrentFiscalYear(id: string): Promise<void> {
  const all = await listFiscalYears();
  for (const fy of all) {
    const shouldBeCurrent = fy.id === id;
    if (fy.isCurrent === shouldBeCurrent) continue;
    await fiscalYears().update({ id: fy.id }, { isCurrent: shouldBeCurrent });
  }
  const target = all.find((fy) => fy.id === id);
  await logAudit({
    domain: 'fiscal_year',
    action: 'status_change',
    recordId: id,
    recordLabel: target?.code,
    summary: `Set ${target?.code ?? id} as the current fiscal year`,
  });
}
