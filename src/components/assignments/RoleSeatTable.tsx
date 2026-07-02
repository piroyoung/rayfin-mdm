/**
 * Presentational table of territory role-seat rows. Id→label lookups and all
 * actions are passed in; row-action visibility comes from the domain workflow
 * (`workflowActions`), never re-derived from status literals here.
 */
import { workflowActions } from '@/domain/assignmentWorkflow';
import {
  ASSIGNMENT_STATUS_META,
  tonedMeta,
  type AssignmentStatus,
  type TerritoryRoleAssignment,
} from '@/domain/types';
import { Badge, Button, RowActions, Tooltip } from '@/components/shared';

interface RoleSeatTableProps {
  rows: TerritoryRoleAssignment[];
  busyId: string | null;
  terrCode: (id: string) => string;
  empName: (id: string) => string;
  fyCode: (id: string) => string;
  roleName: (code: string) => string;
  onAdvance: (row: TerritoryRoleAssignment, status: AssignmentStatus) => void;
  onCopy: (row: TerritoryRoleAssignment) => void;
  onVacate: (row: TerritoryRoleAssignment) => void;
}

export function RoleSeatTable({
  rows,
  busyId,
  terrCode,
  empName,
  fyCode,
  roleName,
  onAdvance,
  onCopy,
  onVacate,
}: RoleSeatTableProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
          <th className="px-4 py-3">Territory</th>
          <th className="px-4 py-3">Role</th>
          <th className="px-4 py-3">Member</th>
          <th className="px-4 py-3">Fiscal year</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((row) => {
          const meta = tonedMeta(ASSIGNMENT_STATUS_META, row.assignmentStatus);
          return (
            <tr key={row.id} className="hover:bg-gray-50/60">
              <td className="px-4 py-3">
                <Badge tone="blue">{terrCode(row.territoryId)}</Badge>
                {!row.currentFlag && (
                  <span className="ml-2 text-xs text-gray-400">(history)</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-gray-900">
                  {roleName(row.roleTypeCode)}
                </span>
                <span className="ml-1 text-xs text-gray-400">
                  {row.roleTypeCode}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-900">
                {empName(row.employeeId)}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {fyCode(row.fiscalYearId)}
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
                  <Tooltip label="このシートを空席にします">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onVacate(row)}
                    >
                      Vacate
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
