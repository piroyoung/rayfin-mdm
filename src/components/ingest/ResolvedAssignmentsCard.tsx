/**
 * Resolved-assignments preview Card: the table of alias→employee intents that
 * will be written as draft role seats. Purely presentational.
 */
import { Badge, Card, EmptyState } from '@/components/shared';
import type { AssignmentIntent } from '@/domain/ingestPlan';

interface ResolvedAssignmentsCardProps {
  intents: AssignmentIntent[];
  fiscalYearCode?: string | null;
}

export function ResolvedAssignmentsCard({
  intents,
  fiscalYearCode,
}: ResolvedAssignmentsCardProps) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-gray-700">
        Resolved assignments
        <span className="ml-2 text-xs font-normal text-gray-500">
          will be written to FY {fiscalYearCode ?? '—'} as drafts
        </span>
      </p>
      {intents.length === 0 ? (
        <EmptyState
          title="No matched assignments"
          description="No alias in this sheet resolved to a known employee."
        />
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-3 font-medium">Account</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Alias</th>
                <th className="py-2 pr-3 font-medium">Primary</th>
                <th className="py-2 pr-3 font-medium">Row</th>
              </tr>
            </thead>
            <tbody>
              {intents.map((i) => (
                <tr
                  key={`${i.sourceRecordId}-${i.roleTypeCode}-${i.employeeId}`}
                  className="border-b border-gray-50"
                >
                  <td className="py-2 pr-3 text-gray-900">{i.accountName}</td>
                  <td className="py-2 pr-3">
                    <Badge tone="blue">{i.roleTypeCode}</Badge>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-gray-600">
                    {i.alias}
                  </td>
                  <td className="py-2 pr-3">
                    {i.isPrimary ? (
                      <span className="text-amber-500">★</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-xs text-gray-400">
                    {i.sourceRow}
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
