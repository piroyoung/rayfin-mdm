/** Role: direct edit of the single role catalogue (AE, CSAM, SE tracks…). */
import { useMemo, useState } from 'react';

import {
  createRole,
  listRoles,
  updateRole,
  type RoleInput,
} from '@/services/roles';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useCrudForm } from '@/usecase/shared/use-crud-form';
import { useToast } from '@/usecase/shared/toast-context';
import { fmtRelative } from '@/lib/format';
import { matchesActive, type ActiveFilterValue } from '@/lib/listing';
import type { Role } from '@/domain/types';
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
  Tooltip,
} from '@/components/shared';
import {
  ActiveFilter,
  FormActions,
  ListCard,
  ListToolbar,
  RowActions,
  StatusBadge,
} from '@/components/shared';

const EMPTY: RoleInput = {
  name: '',
  isAccountAssignable: true,
  isTerritoryAssignable: false,
};

function snapshot(r: Role): RoleInput {
  return {
    name: r.name,
    description: r.description,
    orgUnit: r.orgUnit,
    solutionArea: r.solutionArea,
    subArea: r.subArea,
    roleFamily: r.roleFamily,
    isAccountAssignable: r.isAccountAssignable,
    isTerritoryAssignable: r.isTerritoryAssignable,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
  };
}

function RoleForm({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial: RoleInput;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: RoleInput) => void;
}) {
  const [form, setForm] = useState<RoleInput>(initial);
  const set = (patch: Partial<RoleInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const valid = (form.name ?? '').trim() !== '';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" required>
          <Input
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Account Executive"
            required
          />
        </Field>
        <Field label="Org unit" hint="STU, CSU, GPS…">
          <Input
            value={form.orgUnit ?? ''}
            onChange={(e) => set({ orgUnit: e.target.value || undefined })}
          />
        </Field>
        <Field label="Solution area">
          <Input
            value={form.solutionArea ?? ''}
            onChange={(e) => set({ solutionArea: e.target.value || undefined })}
          />
        </Field>
        <Field label="Sub area">
          <Input
            value={form.subArea ?? ''}
            onChange={(e) => set({ subArea: e.target.value || undefined })}
          />
        </Field>
        <Field label="Role family" hint="Sales, Technical, Customer Success…">
          <Input
            value={form.roleFamily ?? ''}
            onChange={(e) => set({ roleFamily: e.target.value || undefined })}
          />
        </Field>
        <Field label="Sort order">
          <Input
            type="number"
            value={form.sortOrder ?? ''}
            onChange={(e) =>
              set({
                sortOrder:
                  e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
          />
        </Field>
        <Field label="Account assignable" hint="Can attach to an account team">
          <Select
            value={form.isAccountAssignable ? 'yes' : 'no'}
            onChange={(e) => set({ isAccountAssignable: e.target.value === 'yes' })}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </Field>
        <Field label="Territory assignable" hint="Can own / anchor a territory">
          <Select
            value={form.isTerritoryAssignable ? 'yes' : 'no'}
            onChange={(e) =>
              set({ isTerritoryAssignable: e.target.value === 'yes' })
            }
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
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
        <div className="sm:col-span-2">
          <Field label="Description">
            <Textarea
              rows={2}
              value={form.description ?? ''}
              onChange={(e) =>
                set({ description: e.target.value || undefined })
              }
            />
          </Field>
        </div>
      </div>

      <FormActions onCancel={onCancel} saving={saving} disabled={!valid} />
    </form>
  );
}

export function RolesPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(listRoles);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');
  const form = useCrudForm<Role, RoleInput>();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const roles = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles.filter((r) => {
      if (!matchesActive(activeFilter, r.isActive)) return false;
      if (!q) return true;
      return [r.name, r.solutionArea, r.orgUnit, r.subArea, r.roleFamily]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [roles, search, activeFilter]);

  async function handleSave(input: RoleInput) {
    setSaving(true);
    try {
      if (form.editing) {
        await updateRole(form.editing.id, input);
        toast('Role updated.', 'success');
      } else {
        await createRole(input);
        toast('Role created.', 'success');
      }
      form.close();
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: Role) {
    setBusyId(r.id);
    try {
      await updateRole(r.id, { ...snapshot(r), isActive: !r.isActive });
      toast(`Role ${r.isActive ? 'deactivated' : 'activated'}.`, 'success');
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
        <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Assignable</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{r.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.isAccountAssignable && (
                          <Badge tone="blue">Account</Badge>
                        )}
                        {r.isTerritoryAssignable && (
                          <Badge tone="purple">Territory</Badge>
                        )}
                        {!r.isAccountAssignable && !r.isTerritoryAssignable && (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={r.isActive} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {fmtRelative(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <RowActions>
                        <Tooltip label="このロールを編集します">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => form.startEdit(r)}
                          >
                            Edit
                          </Button>
                        </Tooltip>
                        <Tooltip label="この行をコピーして新しいロールを作成します">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => form.startDuplicate(snapshot(r))}
                          >
                            Copy
                          </Button>
                        </Tooltip>
                        <Tooltip
                          label={
                            r.isActive
                              ? 'このロールを無効化します'
                              : 'このロールを有効化します'
                          }
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={busyId === r.id}
                            onClick={() => toggleActive(r)}
                          >
                            {r.isActive ? 'Deactivate' : 'Activate'}
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
            ? `Edit ${form.editing.name}`
            : form.mode === 'duplicate'
              ? 'New role (copy)'
              : 'New role'
        }
        size="lg"
      >
        <RoleForm
          initial={form.editing ? snapshot(form.editing) : (form.seed ?? EMPTY)}
          saving={saving}
          onCancel={form.close}
          onSubmit={handleSave}
        />
      </Modal>
    </div>
  );
}
