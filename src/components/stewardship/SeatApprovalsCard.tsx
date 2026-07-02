/** Seat-approval queue: SUBMITTED territory-role seats awaiting a decision. */
import { Badge, Button, Card } from '@/components/shared';
import type { TerritoryRoleAssignment } from '@/domain/types';

interface SeatApprovalsCardProps {
  submitted: TerritoryRoleAssignment[];
  territoryName: (id: string) => string;
  employeeName: (id: string) => string;
  roleName: (code: string) => string;
  busyId: string | null;
  onApprove: (seat: TerritoryRoleAssignment) => void;
  onSendBack: (seat: TerritoryRoleAssignment) => void;
}

export function SeatApprovalsCard({
  submitted,
  territoryName,
  employeeName,
  roleName,
  busyId,
  onApprove,
  onSendBack,
}: SeatApprovalsCardProps) {
  if (submitted.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Seat approvals</p>
        <Badge tone="amber">{submitted.length} submitted</Badge>
      </div>
      <ul className="mt-3 divide-y divide-gray-50">
        {submitted.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm"
          >
            <span className="font-medium text-gray-900">
              {territoryName(a.territoryId)}
            </span>
            <Badge tone="blue">{roleName(a.roleTypeCode)}</Badge>
            <span className="text-gray-600">{employeeName(a.employeeId)}</span>
            <div className="ml-auto flex items-center gap-1">
              <Button
                size="sm"
                variant="primary"
                loading={busyId === a.id}
                onClick={() => onApprove(a)}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                loading={busyId === a.id}
                onClick={() => onSendBack(a)}
              >
                Send back
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
