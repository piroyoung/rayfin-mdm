/**
 * TerritoryAccountAssignment: direct edit of account → territory placements.
 *
 * Thin route container: the {@link useTerritoryAccountAssignments} view-model
 * owns data loading, form / confirm state, lookups, and placement orchestration;
 * the assignment components render.
 */
import {
  Button,
  ConfirmDialog,
  Modal,
  PageHeader,
  Tooltip,
} from '@/components/shared';
import { ListCard } from '@/components/shared';
import { PlacementForm } from '@/components/assignments/PlacementForm';
import { PlacementTable } from '@/components/assignments/PlacementTable';
import {
  EMPTY_PLACEMENT,
  placementSnapshot,
  useTerritoryAccountAssignments,
} from '@/usecase/assignments/use-territory-account-assignments';

export function TerritoryAccountAssignmentsPage() {
  const vm = useTerritoryAccountAssignments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="TerritoryAccountAssignment"
        subtitle="Which territory an account sits in for a fiscal year. One row per account / FY; history is preserved."
        actions={
          <Tooltip label="新しいテリトリ配置を作成します" side="bottom">
            <Button variant="primary" onClick={() => vm.form.startCreate()}>
              + New placement
            </Button>
          </Tooltip>
        }
      />

      <ListCard
        loading={vm.loading}
        error={vm.error}
        isEmpty={vm.sorted.length === 0}
        loadingLabel="Loading placements…"
        errorTitle="Couldn't load placements"
        emptyTitle="No placements yet"
        emptyDescription="Place an account in a territory to get started."
      >
        <PlacementTable
          rows={vm.sorted}
          busyId={vm.busyId}
          accName={vm.accName}
          terrCode={vm.terrCode}
          fyCode={vm.fyCode}
          onAdvance={vm.advance}
          onCopy={(row) => vm.form.startDuplicate(placementSnapshot(row))}
          onDelete={vm.setToDelete}
        />
      </ListCard>

      <Modal
        open={vm.form.open}
        onClose={vm.form.close}
        title={
          vm.form.mode === 'duplicate'
            ? 'Copy placement'
            : 'New territory placement'
        }
        size="lg"
      >
        <PlacementForm
          initial={vm.form.seed ?? EMPTY_PLACEMENT}
          accounts={vm.accounts}
          territories={vm.territories}
          fiscalYears={vm.fiscalYears}
          saving={vm.saving}
          onCancel={vm.form.close}
          onSubmit={vm.handleCreate}
        />
      </Modal>

      <ConfirmDialog
        open={vm.toDelete !== null}
        title="Remove placement"
        message="This removes the territory placement row. SCD history rows are kept; prefer Retire to close a placement."
        confirmLabel="Delete"
        danger
        loading={vm.busyId === vm.toDelete?.id}
        onConfirm={vm.confirmDelete}
        onCancel={() => vm.setToDelete(null)}
      />
    </div>
  );
}
