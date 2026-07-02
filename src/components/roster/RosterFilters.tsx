/**
 * Territory + fiscal-year selectors for the roster screen. Presentational: the
 * page owns the selected ids and passes change handlers.
 */
import type { FiscalYear, Territory } from '@/domain/types';
import { Card, Field, Select } from '@/components/shared';

interface RosterFiltersProps {
  territories: Territory[];
  fiscalYears: FiscalYear[];
  territoryId: string;
  fiscalYearId: string;
  onTerritoryChange: (territoryId: string) => void;
  onFiscalYearChange: (fiscalYearId: string) => void;
}

export function RosterFilters({
  territories,
  fiscalYears,
  territoryId,
  fiscalYearId,
  onTerritoryChange,
  onFiscalYearChange,
}: RosterFiltersProps) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Territory">
          <Select
            value={territoryId}
            onChange={(e) => onTerritoryChange(e.target.value)}
          >
            {territories.length === 0 && <option value="">— None —</option>}
            {territories.map((t) => (
              <option key={t.id} value={t.id}>
                {t.territoryCode} — {t.territoryName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fiscal year">
          <Select
            value={fiscalYearId}
            onChange={(e) => onFiscalYearChange(e.target.value)}
          >
            {fiscalYears.map((f) => (
              <option key={f.id} value={f.id}>
                {f.code}
                {f.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Card>
  );
}
