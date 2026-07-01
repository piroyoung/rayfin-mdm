/** Employees: list, search, CRUD, active toggle, and identity-conflict alerts. */
import { useMemo, useState } from 'react';

import {
  createEmployee,
  listEmployees,
  setEmployeeActive,
  updateEmployee,
  findEmployeeIdentityConflicts,
  type EmployeeInput,
} from '@/services/employees';
import { listRoles } from '@/services/roles';
import { employeeInputFromUser } from '@/services/identity';
import { useAuth } from '@/hooks/AuthContext';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useCrudForm } from '@/hooks/useCrudForm';
import { useToast } from '@/hooks/useToast';
import { fmtRelative } from '@/lib/format';
import { matchesActive, type ActiveFilterValue } from '@/lib/listing';
import type { Employee, Role } from '@/domain/types';
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Tooltip,
} from '@/components/ui';
import {
  ActiveFilter,
  FormActions,
  ListCard,
  ListToolbar,
  RowActions,
  StatusBadge,
} from '@/components/listing';

const EMPTY: EmployeeInput = { displayName: '' };

function snapshot(e: Employee): EmployeeInput {
  return {
    personnelNumber: e.personnelNumber,
    alias: e.alias,
    upn: e.upn,
    email: e.email,
    entraObjectId: e.entraObjectId,
    displayName: e.displayName,
    localName: e.localName,
    jobTitle: e.jobTitle,
    roleTypeCode: e.roleTypeCode,
    countryCode: e.countryCode,
    officeLocation: e.officeLocation,
    employmentStatus: e.employmentStatus,
    isActive: e.isActive,
  };
}

function EmployeeForm({
  initial,
  saving,
  roles,
  onCancel,
  onSubmit,
}: {
  initial: EmployeeInput;
  saving: boolean;
  roles: Role[];
  onCancel: () => void;
  onSubmit: (input: EmployeeInput) => void;
}) {
  const [form, setForm] = useState<EmployeeInput>(initial);
  const { user } = useAuth();
  const set = (patch: Partial<EmployeeInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const valid = (form.displayName ?? '').trim() !== '';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      {user && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-indigo-50/60 px-3 py-2">
          <p className="text-xs text-indigo-700">
            Every employee is a tenant user. Prefill this form from the account
            you&apos;re signed in as.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => set(employeeInputFromUser(user))}
          >
            Use my account
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Display name" required>
          <Input
            value={form.displayName}
            onChange={(e) => set({ displayName: e.target.value })}
            placeholder="Hanako Mizukami"
            required
          />
        </Field>
        <Field label="Local name">
          <Input
            value={form.localName ?? ''}
            onChange={(e) => set({ localName: e.target.value })}
            placeholder="水上 花子"
          />
        </Field>
        <Field label="Alias" hint="Source-workbook login, e.g. HMIZUKAMI">
          <Input
            value={form.alias ?? ''}
            onChange={(e) => set({ alias: e.target.value })}
          />
        </Field>
        <Field label="Personnel number">
          <Input
            value={form.personnelNumber ?? ''}
            onChange={(e) => set({ personnelNumber: e.target.value })}
          />
        </Field>
        <Field label="UPN">
          <Input
            value={form.upn ?? ''}
            onChange={(e) => set({ upn: e.target.value })}
            placeholder="hmizukami@contoso.com"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email ?? ''}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
        <Field
          label="Entra object ID"
          hint="Durable tenant identity (oid). Set via “Use my account”."
        >
          <Input
            value={form.entraObjectId ?? ''}
            onChange={(e) =>
              set({ entraObjectId: e.target.value || undefined })
            }
            placeholder="—"
          />
        </Field>
        <Field label="Job title">
          <Input
            value={form.jobTitle ?? ''}
            onChange={(e) => set({ jobTitle: e.target.value })}
          />
        </Field>
        <Field label="Home role" hint="The role this person is normally staffed as">
          <Select
            value={form.roleTypeCode ?? ''}
            onChange={(e) => set({ roleTypeCode: e.target.value || undefined })}
          >
            <option value="">— None —</option>
            {roles.map((r) => (
              <option key={r.code} value={r.code}>
                {r.code} — {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Country code" hint="ISO-2, e.g. JP">
          <Input
            value={form.countryCode ?? ''}
            maxLength={2}
            onChange={(e) => set({ countryCode: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Office location">
          <Input
            value={form.officeLocation ?? ''}
            onChange={(e) => set({ officeLocation: e.target.value })}
          />
        </Field>
        <Field label="Employment status">
          <Input
            value={form.employmentStatus ?? ''}
            onChange={(e) => set({ employmentStatus: e.target.value })}
            placeholder="Active, Leave…"
          />
        </Field>
        <Field label="Active">
          <Select
            value={form.isActive === false ? 'no' : 'yes'}
            onChange={(e) => set({ isActive: e.target.value === 'yes' })}
          >
            <option value="yes">Active</option>
            <option value="no">Inactive</option>
          </Select>
        </Field>
      </div>

      <FormActions onCancel={onCancel} saving={saving} disabled={!valid} />
    </form>
  );
}

export function EmployeesPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(listEmployees);
  const { data: roleData } = useAsyncData(listRoles);
  const roles = useMemo(() => roleData ?? [], [roleData]);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');
  const form = useCrudForm<Employee, EmployeeInput>();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const employees = useMemo(() => data ?? [], [data]);

  const conflicts = useMemo(
    () => findEmployeeIdentityConflicts(employees),
    [employees]
  );
  const conflictedIds = useMemo(
    () => new Set(conflicts.flatMap((c) => c.ids)),
    [conflicts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (!matchesActive(activeFilter, e.isActive)) return false;
      if (!q) return true;
      return [e.displayName, e.localName, e.alias, e.upn, e.email, e.jobTitle]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [employees, search, activeFilter]);

  async function handleSave(input: EmployeeInput) {
    setSaving(true);
    try {
      if (form.editing) {
        await updateEmployee(form.editing.id, input);
        toast('Employee updated.', 'success');
      } else {
        await createEmployee(input);
        toast('Employee created.', 'success');
      }
      form.close();
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(e: Employee) {
    setBusyId(e.id);
    try {
      await setEmployeeActive(e, !e.isActive);
      toast(`Employee ${e.isActive ? 'deactivated' : 'activated'}.`, 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

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

      {conflicts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 p-4">
          <p className="text-sm font-medium text-amber-800">
            ⚠ {conflicts.length} identity conflict
            {conflicts.length > 1 ? 's' : ''} among active employees
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-700">
            {conflicts.map((c) => (
              <li key={`${c.field}:${c.value}`}>
                Duplicate <span className="font-medium">{c.field}</span> “
                {c.value}” shared by {c.ids.length} employees
              </li>
            ))}
          </ul>
        </Card>
      )}

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
        <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Alias</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {conflictedIds.has(e.id) && (
                          <span title="Identity conflict" className="text-amber-500">
                            ⚠
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">
                            {e.displayName}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {e.localName ?? e.upn ?? e.email ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{e.alias ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {e.jobTitle ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={e.isActive} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {fmtRelative(e.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <RowActions>
                        <Tooltip label="この従業員情報を編集します">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => form.startEdit(e)}
                          >
                            Edit
                          </Button>
                        </Tooltip>
                        <Tooltip label="この行をコピーして新しい従業員を作成します">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              form.startDuplicate({
                                ...snapshot(e),
                                entraObjectId: undefined,
                              })
                            }
                          >
                            Copy
                          </Button>
                        </Tooltip>
                        <Tooltip
                          label={
                            e.isActive
                              ? 'この従業員を無効化します'
                              : 'この従業員を有効化します'
                          }
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={busyId === e.id}
                            onClick={() => toggleActive(e)}
                          >
                            {e.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </Tooltip>
                      </RowActions>
                    </td>
                  </tr>
                ))}
              </tbody>
        </table>
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
          initial={form.editing ? snapshot(form.editing) : (form.seed ?? EMPTY)}
          saving={saving}
          roles={roles}
          onCancel={form.close}
          onSubmit={handleSave}
        />
      </Modal>
    </div>
  );
}
