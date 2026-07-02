/**
 * Role-seat grid for a territory: header (staffed count), loading / empty
 * states, and one {@link RosterSeatRow} per account-assignable role.
 * Presentational — the seat lookup and all handlers are passed in.
 */
import type {
  AssignmentStatus,
  Employee,
  Role,
  TerritoryRoleAssignment,
} from '@/domain/types';
import { Card, EmptyState, Spinner } from '@/components/shared';

import { RosterSeatRow } from './RosterSeatRow';

interface RosterTableProps {
  territoryLabel: string | null;
  filledSeats: number;
  totalRoles: number;
  territorySelected: boolean;
  loading: boolean;
  roles: Role[];
  seatFor: (roleTypeCode: string) => TerritoryRoleAssignment | undefined;
  employeeById: Map<string, Employee>;
  activeEmployees: Employee[];
  busyRole: string | null;
  onAssign: (roleTypeCode: string, employeeId: string) => void;
  onAdvance: (seat: TerritoryRoleAssignment, status: AssignmentStatus) => void;
}

export function RosterTable({
  territoryLabel,
  filledSeats,
  totalRoles,
  territorySelected,
  loading,
  roles,
  seatFor,
  employeeById,
  activeEmployees,
  busyRole,
  onAssign,
  onAdvance,
}: RosterTableProps) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {territoryLabel ?? 'Role seats'}
          </p>
          <p className="text-xs text-gray-500">
            {filledSeats} of {totalRoles} roles staffed
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !territorySelected || roles.length === 0 ? (
        <EmptyState
          title="Nothing to staff"
          description="Pick a territory and fiscal year, and make sure account-assignable roles exist."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.map((role) => (
                <RosterSeatRow
                  key={role.code}
                  role={role}
                  seat={seatFor(role.code)}
                  busy={busyRole === role.code}
                  employeeById={employeeById}
                  activeEmployees={activeEmployees}
                  onAssign={onAssign}
                  onAdvance={onAdvance}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
