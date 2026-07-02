/**
 * Fiscal-year coverage comparison card: this year's member next to last year's,
 * per role, with a "Changed" flag. Presentational — the merged comparison rows
 * and the previous fiscal year come from the view-model.
 */
import type { FiscalYear } from '@/domain/types';
import { Badge, Card, EmptyState, Spinner } from '@/components/shared';

import type { CoverageComparisonRow } from '@/usecase/assignments/use-account-assignments';

interface CoverageComparisonCardProps {
  prevFiscalYear: FiscalYear;
  loading: boolean;
  rows: CoverageComparisonRow[];
  roleName: (code: string) => string;
  empName: (id: string) => string;
}

export function CoverageComparisonCard({
  prevFiscalYear,
  loading,
  rows,
  roleName,
  empName,
}: CoverageComparisonCardProps) {
  return (
    <Card>
      <div className="border-b border-gray-100 p-4">
        <p className="text-sm font-medium text-gray-700">
          Coverage vs {prevFiscalYear.code}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          This year&apos;s member next to last year&apos;s, per role — the
          workbook&apos;s <code>*_Change</code> columns.
        </p>
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Comparing…" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing to compare"
          description="No roster coverage in either fiscal year for this account."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">{prevFiscalYear.code}</th>
                <th className="px-4 py-3">This year</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => (
                <tr key={row.roleTypeCode} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {roleName(row.roleTypeCode)}
                    </span>
                    <span className="ml-1 text-xs text-gray-400">
                      {row.roleTypeCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {row.previousEmployeeId
                      ? empName(row.previousEmployeeId)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {row.currentEmployeeId
                      ? empName(row.currentEmployeeId)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.changed && <Badge tone="amber">Changed</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
