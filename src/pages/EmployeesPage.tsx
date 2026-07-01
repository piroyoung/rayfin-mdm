/** Employees: thin route container for the sales-team-member master. */
import {
  ActiveFilter,
  Button,
  ListCard,
  ListToolbar,
  Modal,
  PageHeader,
  Tooltip,
} from '@/components/shared';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { EmployeesTable } from '@/components/employees/EmployeesTable';
import { IdentityConflictsCard } from '@/components/employees/IdentityConflictsCard';
import { EMPTY_EMPLOYEE } from '@/usecase/employees/use-employee-form';
import { useEmployees } from '@/usecase/employees/use-employees';

export function EmployeesPage() {
  const {
    employees,
    roles,
    filtered,
    conflicts,
    conflictedIds,
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
    snapshot,
  } = useEmployees();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        subtitle="Sales-team-member master. Roles are assignments, not columns — manage coverage on the Assignments page."
        actions={
          <Tooltip label="新しい従業員マスターを作成します" side="bottom">
            <Button variant="primary" onClick={() => form.startCreate()}>
              + New employee
            </Button>
          </Tooltip>
        }
      />

      <IdentityConflictsCard conflicts={conflicts} />

      <ListCard
        toolbar={
          <ListToolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search name, alias, UPN, email…"
          >
            <ActiveFilter value={activeFilter} onChange={setActiveFilter} />
          </ListToolbar>
        }
        loading={loading}
        error={error}
        isEmpty={filtered.length === 0}
        loadingLabel="Loading employees…"
        errorTitle="Couldn't load employees"
        emptyTitle="No employees found"
        emptyDescription={
          employees.length === 0
            ? 'Create your first employee record.'
            : 'Try adjusting your search or filters.'
        }
      >
        <EmployeesTable
          employees={filtered}
          conflictedIds={conflictedIds}
          busyId={busyId}
          onEdit={form.startEdit}
          onDuplicate={(e) =>
            form.startDuplicate({ ...snapshot(e), entraObjectId: undefined })
          }
          onToggleActive={toggleActive}
        />
      </ListCard>

      <Modal
        open={form.open}
        onClose={form.close}
        title={
          form.editing
            ? `Edit ${form.editing.displayName}`
            : form.mode === 'duplicate'
              ? 'New employee (copy)'
              : 'New employee'
        }
        size="lg"
      >
        <EmployeeForm
          initial={
            form.editing ? snapshot(form.editing) : (form.seed ?? EMPTY_EMPLOYEE)
          }
          saving={saving}
          roles={roles}
          onCancel={form.close}
          onSubmit={save}
        />
      </Modal>
    </div>
  );
}
