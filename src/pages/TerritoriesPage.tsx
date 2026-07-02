/** Territories: thin route container over the territory master view-model. */
import {
  Button,
  ListCard,
  ListToolbar,
  Modal,
  PageHeader,
  Tooltip,
} from '@/components/shared';
import { TerritoriesTable } from '@/components/territories/TerritoriesTable';
import { TerritoryForm } from '@/components/territories/TerritoryForm';
import { EMPTY_TERRITORY } from '@/usecase/territories/use-territory-form';
import { useTerritories } from '@/usecase/territories/use-territories';

export function TerritoriesPage() {
  const {
    territories,
    fiscalYears,
    filtered,
    loading,
    error,
    search,
    setSearch,
    fyCode,
    form,
    saving,
    busyId,
    save,
    toggleActive,
    snapshot,
  } = useTerritories();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Territories"
        subtitle="Territory / POD / sales-unit master, scoped by fiscal year."
        actions={
          <Tooltip label="新しいテリトリーを作成します" side="bottom">
            <Button variant="primary" onClick={() => form.startCreate()}>
              + New territory
            </Button>
          </Tooltip>
        }
      />

      <ListCard
        toolbar={
          <ListToolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search code, name, type, region…"
          />
        }
        loading={loading}
        error={error}
        isEmpty={filtered.length === 0}
        loadingLabel="Loading territories…"
        errorTitle="Couldn't load territories"
        emptyTitle="No territories found"
        emptyDescription={
          territories.length === 0
            ? 'Create your first territory.'
            : 'Try adjusting your search.'
        }
      >
        <TerritoriesTable
          territories={filtered}
          busyId={busyId}
          fyCode={fyCode}
          onEdit={form.startEdit}
          onDuplicate={(t) =>
            form.startDuplicate({ ...snapshot(t), territoryCode: '' })
          }
          onToggleActive={toggleActive}
        />
      </ListCard>

      <Modal
        open={form.open}
        onClose={form.close}
        title={
          form.editing
            ? `Edit ${form.editing.territoryName}`
            : form.mode === 'duplicate'
              ? 'New territory (copy)'
              : 'New territory'
        }
        size="lg"
      >
        <TerritoryForm
          initial={
            form.editing ? snapshot(form.editing) : (form.seed ?? EMPTY_TERRITORY)
          }
          selfId={form.editing?.id}
          territories={territories}
          fiscalYears={fiscalYears}
          saving={saving}
          onCancel={form.close}
          onSubmit={save}
        />
      </Modal>
    </div>
  );
}
