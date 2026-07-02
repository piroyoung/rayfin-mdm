/**
 * Presentational table of territory placement rows. Id→label lookups and all
 * actions are passed in; row-action visibility comes from the domain workflow
 * (`workflowActions`), never re-derived from status literals here.
 */
import { workflowActions } from '@/domain/assignmentWorkflow';
import {
  ASSIGNMENT_STATUS_META,
  tonedMeta,
  type AssignmentStatus,
  type TerritoryAccountAssignment,
} from '@/domain/types';
import { Badge, Button, RowActions, Tooltip } from '@/components/shared';

interface PlacementTableProps {
  rows: TerritoryAccountAssignment[];
  busyId: string | null;
  accName: (id: string) => string;
  terrCode: (id: string) => string;
  fyCode: (id: string) => string;
  onAdvance: (
    row: TerritoryAccountAssignment,
    status: AssignmentStatus
  ) => void;
  onCopy: (row: TerritoryAccountAssignment) => void;
  onDelete: (row: TerritoryAccountAssignment) => void;
}

export function PlacementTable({
  rows,
  busyId,
  accName,
  terrCode,
  fyCode,
  onAdvance,
  onCopy,
  onDelete,
}: PlacementTableProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
          <th className="px-4 py-3">Account</th>
          <th className="px-4 py-3">Territory</th>
          <th className="px-4 py-3">Fiscal year</th>
          <th className="px-4 py-3">Type</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((row) => {
          const meta = tonedMeta(ASSIGNMENT_STATUS_META, row.assignmentStatus);
          return (
            <tr key={row.id} className="hover:bg-gray-50/60">
              <td className="px-4 py-3 font-medium text-gray-900">
                {accName(row.accountId)}
                {!row.currentFlag && (
                  <span className="ml-2 text-xs text-gray-400">(history)</span>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge tone="blue">{terrCode(row.territoryId)}</Badge>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {fyCode(row.fiscalYearId)}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {row.assignmentType ?? '—'}
              </td>
              <td className="px-4 py-3">
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </td>
              <td className="px-4 py-3">
                <RowActions>
                  {workflowActions(row.assignmentStatus).map((a) => (
                    <Button
                      key={a.to}
                      size="sm"
                      variant={a.variant}
                      loading={busyId === row.id}
                      onClick={() => onAdvance(row, a.to)}
                    >
                      {a.label}
                    </Button>
                  ))}
                  <Tooltip label="この行をコピーして新規作成します（年度を変えて再利用）">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCopy(row)}
                    >
                      Copy
                    </Button>
                  </Tooltip>
                  <Tooltip label="この配置を削除します">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(row)}
                    >
                      Delete
                    </Button>
                  </Tooltip>
                </RowActions>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
