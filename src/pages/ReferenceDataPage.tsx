/** Reference Data: thin route container for governed code lists. */
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeader,
  Spinner,
  Tooltip,
} from '@/components/shared';
import { ReferenceForm } from '@/components/reference/ReferenceForm';
import { ReferenceGroups } from '@/components/reference/ReferenceGroups';
import { useReference } from '@/usecase/reference/use-reference';
import { EMPTY_REFERENCE } from '@/usecase/reference/use-reference-form';
import { referenceSnapshot } from '@/usecase/reference/selectors';

export function ReferenceDataPage() {
  const {
    loading,
    error,
    groups,
    knownSets,
    form,
    saving,
    busyId,
    toDelete,
    setToDelete,
    save,
    remove,
  } = useReference();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reference Data"
        subtitle="Governed code lists shared across the master-data domains."
        actions={
          <Tooltip
            label="新しい参照データ（コードリストの値）を追加します"
            side="bottom"
          >
            <Button variant="primary" onClick={() => form.startCreate()}>
              + New value
            </Button>
          </Tooltip>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Loading reference data…" />
        </div>
      ) : error ? (
        <Card>
          <EmptyState title="Couldn't load reference data" description={error} />
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState
            title="No reference data yet"
            description="Add a governed code list value to get started."
          />
        </Card>
      ) : (
        <ReferenceGroups
          groups={groups}
          busyId={busyId}
          onEdit={form.startEdit}
          onDelete={setToDelete}
        />
      )}

      <Modal
        open={form.open}
        onClose={form.close}
        title={form.editing ? 'Edit reference value' : 'New reference value'}
      >
        <ReferenceForm
          initial={
            form.editing ? referenceSnapshot(form.editing) : EMPTY_REFERENCE
          }
          knownSets={knownSets}
          saving={saving}
          onCancel={form.close}
          onSubmit={save}
        />
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete reference value"
        message={
          toDelete
            ? `Delete ${toDelete.setName} / ${toDelete.code} (${toDelete.label})?`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={busyId === toDelete?.id}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && void remove(toDelete)}
      />
    </div>
  );
}
