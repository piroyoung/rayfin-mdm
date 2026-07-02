/** Role: thin route container for the single role catalogue. */
import {
  Button,
  ListCard,
  ListToolbar,
  Modal,
  PageHeader,
  Tooltip,
} from '@/components/shared';
import { ActiveFilter } from '@/components/shared';
import { RoleForm } from '@/components/roles/RoleForm';
import { RolesTable } from '@/components/roles/RolesTable';
import { useRoles } from '@/usecase/roles/use-roles';
import { EMPTY_ROLE } from '@/usecase/roles/use-role-form';
import { roleSnapshot } from '@/usecase/roles/selectors';

export function RolesPage() {
  const {
    roles,
    filtered,
    loading,
    error,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    form,
    saving,
    busyId,
    save,
    toggleActive,
  } = useRoles();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role"
        subtitle="The role catalogue. Roles are data, not columns — a new FY role is a new row."
        actions={
          <Tooltip label="新しいロールを作成します" side="bottom">
            <Button variant="primary" onClick={() => form.startCreate()}>
              + New role
            </Button>
          </Tooltip>
        }
      />

      <ListCard
        toolbar={
          <ListToolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search code, name, family…"
          >
            <ActiveFilter value={activeFilter} onChange={setActiveFilter} />
          </ListToolbar>
        }
        loading={loading}
        error={error}
        isEmpty={filtered.length === 0}
        loadingLabel="Loading roles…"
        errorTitle="Couldn't load roles"
        emptyTitle="No roles found"
        emptyDescription={
          roles.length === 0
            ? 'Create your first role.'
            : 'Try adjusting your search or filters.'
        }
      >
        <RolesTable
          roles={filtered}
          busyId={busyId}
          onEdit={form.startEdit}
          onDuplicate={(r) => form.startDuplicate(roleSnapshot(r))}
          onToggleActive={toggleActive}
        />
      </ListCard>

      <Modal
        open={form.open}
        onClose={form.close}
        title={
          form.editing
            ? `Edit ${form.editing.name}`
            : form.mode === 'duplicate'
              ? 'New role (copy)'
              : 'New role'
        }
        size="lg"
      >
        <RoleForm
          initial={
            form.editing ? roleSnapshot(form.editing) : (form.seed ?? EMPTY_ROLE)
          }
          saving={saving}
          onCancel={form.close}
          onSubmit={save}
        />
      </Modal>
    </div>
  );
}
