/** Stewardship: the change-request approval queue. */
import { ChangeRequestCard } from '@/components/stewardship/ChangeRequestCard';
import { ChangeRequestDecisionModal } from '@/components/stewardship/ChangeRequestDecisionModal';
import { SeatApprovalsCard } from '@/components/stewardship/SeatApprovalsCard';
import {
  Card,
  EmptyState,
  PageHeader,
  Select,
  Spinner,
} from '@/components/shared';
import { type ChangeStatus } from '@/domain/types';
import { useSeatApprovals } from '@/usecase/stewardship/use-seat-approvals';
import { useStewardship } from '@/usecase/stewardship/use-stewardship';

export function StewardshipPage() {
  const vm = useStewardship();
  const seats = useSeatApprovals();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stewardship"
        subtitle="Review and approve proposed changes before they become golden records."
        actions={
          <Select
            className="w-44"
            value={vm.statusFilter}
            onChange={(e) =>
              vm.setStatusFilter(e.target.value as ChangeStatus | 'all')
            }
          >
            <option value="all">All requests</option>
            <option value="open">Open ({vm.openCount})</option>
            <option value="applied">Applied</option>
            <option value="rejected">Rejected</option>
          </Select>
        }
      />

      <SeatApprovalsCard
        submitted={seats.submitted}
        territoryName={seats.territoryName}
        employeeName={seats.employeeName}
        roleName={seats.roleName}
        busyId={seats.busyId}
        onApprove={seats.approve}
        onSendBack={seats.sendBack}
      />

      {vm.loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Loading change requests…" />
        </div>
      ) : vm.error ? (
        <Card>
          <EmptyState
            title="Couldn't load change requests"
            description={vm.error}
          />
        </Card>
      ) : vm.filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing to review"
            description={
              vm.statusFilter === 'open'
                ? 'There are no open change requests. Submit a record for approval to see it here.'
                : 'No change requests match this filter.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {vm.filtered.map((cr) => (
            <ChangeRequestCard
              key={cr.id}
              request={cr}
              busy={vm.busyId === cr.id}
              onApprove={vm.askApprove}
              onReject={vm.askReject}
            />
          ))}
        </div>
      )}

      <ChangeRequestDecisionModal
        decision={vm.decision}
        note={vm.note}
        busy={vm.busyId === vm.decision?.request.id}
        onNoteChange={vm.setNote}
        onCancel={() => vm.setDecision(null)}
        onConfirm={vm.confirmDecision}
      />
    </div>
  );
}
