/**
 * One role-seat row: the current member selector, the seat status badge, and the
 * workflow / vacate actions for a single role. Presentational — every decision
 * (which actions a status allows, whether a transition is legal) comes from the
 * domain workflow helpers, and the handlers are passed in.
 */
import { canTransition, workflowActions } from '@/domain/assignmentWorkflow';
import {
  ASSIGNMENT_STATUS_META,
  tonedMeta,
  type AssignmentStatus,
  type Employee,
  type Role,
  type TerritoryRoleAssignment,
} from '@/domain/types';
import { Badge, Button, Select, Tooltip } from '@/components/shared';

interface RosterSeatRowProps {
  role: Role;
  seat: TerritoryRoleAssignment | undefined;
  busy: boolean;
  employeeById: Map<string, Employee>;
  activeEmployees: Employee[];
  onAssign: (roleTypeCode: string, employeeId: string) => void;
  onAdvance: (seat: TerritoryRoleAssignment, status: AssignmentStatus) => void;
}

export function RosterSeatRow({
  role,
  seat,
  busy,
  employeeById,
  activeEmployees,
  onAssign,
  onAdvance,
}: RosterSeatRowProps) {
  const meta = seat
    ? tonedMeta(ASSIGNMENT_STATUS_META, seat.assignmentStatus)
    : null;
  const holder = seat ? employeeById.get(seat.employeeId) : undefined;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900">{role.code}</p>
        <p className="text-xs text-gray-500">{role.name}</p>
      </td>
      <td className="px-4 py-3">
        <Select
          value={seat?.employeeId ?? ''}
          disabled={busy}
          onChange={(e) => onAssign(role.code, e.target.value)}
        >
          <option value="">— Vacant —</option>
          {seat && holder && !holder.isActive && (
            <option value={seat.employeeId}>{holder.displayName} (inactive)</option>
          )}
          {activeEmployees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.displayName}
              {e.alias ? ` (${e.alias})` : ''}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-4 py-3">
        {seat && meta ? (
          <Badge tone={meta.tone}>{meta.label}</Badge>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {seat &&
            workflowActions(seat.assignmentStatus).map((a) => (
              <Tooltip key={a.to} label={`Move to ${a.label}`}>
                <Button
                  size="sm"
                  variant={a.variant}
                  loading={busy}
                  disabled={!canTransition(seat.assignmentStatus, a.to)}
                  onClick={() => onAdvance(seat, a.to)}
                >
                  {a.label}
                </Button>
              </Tooltip>
            ))}
          {seat && (
            <Tooltip label="Vacate this seat">
              <Button
                size="sm"
                variant="ghost"
                loading={busy}
                onClick={() => onAssign(role.code, '')}
              >
                Clear
              </Button>
            </Tooltip>
          )}
        </div>
      </td>
    </tr>
  );
}
