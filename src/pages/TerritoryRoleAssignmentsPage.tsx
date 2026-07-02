/**
 * TerritoryRoleAssignment: direct edit of territory role-seat roster rows.
 *
 * Thin route container: the {@link useTerritoryRoleAssignments} view-model owns
 * data loading, form / confirm state, lookups, and seat orchestration; the
 * assignment components render.
 */
import {
  Button,
  ConfirmDialog,
  Modal,
  PageHeader,
  Tooltip,
} from '@/components/shared';
import { ListCard } from '@/components/shared';
import { RoleSeatForm } from '@/components/assignments/RoleSeatForm';
import { RoleSeatTable } from '@/components/assignments/RoleSeatTable';
import {
  EMPTY_SEAT,
  seatSnapshot,
  useTerritoryRoleAssignments,
} from '@/usecase/assignments/use-territory-role-assignments';

export function TerritoryRoleAssignmentsPage() {
  const vm = useTerritoryRoleAssignments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="TerritoryRoleAssignment"
        subtitle="Who staffs each role seat in a territory, per fiscal year. One seat per territory / role / FY."
        actions={
          <Tooltip label="新しいロールシートを作成します" side="bottom">
            <Button variant="primary" onClick={() => vm.form.startCreate()}>
              + New seat
            </Button>
          </Tooltip>
        }
      />

      <ListCard
        loading={vm.loading}
        error={vm.error}
        isEmpty={vm.sorted.length === 0}
        loadingLabel="Loading seats…"
        errorTitle="Couldn't load seats"
        emptyTitle="No seats yet"
        emptyDescription="Staff a role seat in a territory to get started."
      >
        <RoleSeatTable
          rows={vm.sorted}
          busyId={vm.busyId}
          terrCode={vm.terrCode}
          empName={vm.empName}
          fyCode={vm.fyCode}
          roleName={vm.roleName}
          onAdvance={vm.advance}
          onCopy={(row) => vm.form.startDuplicate(seatSnapshot(row))}
          onVacate={vm.setToDelete}
        />
      </ListCard>

      <Modal
        open={vm.form.open}
        onClose={vm.form.close}
        title={vm.form.mode === 'duplicate' ? 'Copy role seat' : 'New role seat'}
        size="lg"
      >
        <RoleSeatForm
          initial={vm.form.seed ?? EMPTY_SEAT}
          territories={vm.territories}
          employees={vm.employees}
          fiscalYears={vm.fiscalYears}
          roles={vm.roles}
          saving={vm.saving}
          onCancel={vm.form.close}
          onSubmit={vm.handleCreate}
        />
      </Modal>

      <ConfirmDialog
        open={vm.toDelete !== null}
        title="Vacate seat"
        message="This removes the seat row entirely. To change the holder while keeping history, use the Territory Roster page instead."
        confirmLabel="Vacate"
        danger
        loading={vm.busyId === vm.toDelete?.id}
        onConfirm={vm.confirmDelete}
        onCancel={() => vm.setToDelete(null)}
      />
    </div>
  );
}
