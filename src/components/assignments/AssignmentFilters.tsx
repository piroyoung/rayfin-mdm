/**
 * Account + fiscal-year selectors for the Assignments screen. Presentational:
 * the view-model owns the selected ids and passes change handlers.
 */
import { accountName } from '@/domain/models/account';
import type { Account, FiscalYear } from '@/domain/types';
import { Card, Field, Select } from '@/components/shared';

interface AssignmentFiltersProps {
  accounts: Account[];
  fiscalYears: FiscalYear[];
  accountId: string;
  fyId: string;
  onAccountChange: (accountId: string) => void;
  onFiscalYearChange: (fiscalYearId: string) => void;
}

export function AssignmentFilters({
  accounts,
  fiscalYears,
  accountId,
  fyId,
  onAccountChange,
  onFiscalYearChange,
}: AssignmentFiltersProps) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Account">
          <Select value={accountId} onChange={(e) => onAccountChange(e.target.value)}>
            <option value="">— select an account —</option>
            {accounts.map((c) => (
              <option key={c.id} value={c.id}>
                {accountName(c)} ({c.accountNumber})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fiscal year">
          <Select value={fyId} onChange={(e) => onFiscalYearChange(e.target.value)}>
            {fiscalYears.length === 0 && <option value="">—</option>}
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                {fy.code}
                {fy.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Card>
  );
}
