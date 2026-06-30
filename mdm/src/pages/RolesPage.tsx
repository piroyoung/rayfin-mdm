/** Role: direct edit of the single role catalogue (AE, CSAM, SE tracks…). */
import { useMemo, useState } from 'react';

import {
  createRole,
  listRoles,
  updateRole,
  type RoleInput,
} from '@/services/roles';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useToast } from '@/hooks/useToast';
import { fmtRelative } from '@/lib/format';
import type { Role } from '@/domain/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Textarea,
  Tooltip,
} from '@/components/ui';

const EMPTY: RoleInput = {
  code: '',
  name: '',
  isAccountAssignable: true,
  isTerritoryAssignable: false,
};

function snapshot(r: Role): RoleInput {
  return {
    code: r.code,
    name: r.name,
    category: r.category,
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
  const valid =
    (form.code ?? '').trim() !== '' && (form.name ?? '').trim() !== '';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Code" required hint="Stable business key, e.g. AE, CSAM">
          <Input
            value={form.code}
            onChange={(e) => set({ code: e.target.value.toUpperCase() })}
            placeholder="AE"
            required
          />
        </Field>
        <Field label="Name" required>
          <Input
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Account Executive"
            required
          />
        </Field>
        <Field label="Category" hint="Sales, Technical, Specialist…">
          <Input
            value={form.category ?? ''}
            onChange={(e) => set({ category: e.target.value || undefined })}
          />
        </Field>
        <Field label="Role family">
          <Input
            value={form.roleFamily ?? ''}
            onChange={(e) => set({ roleFamily: e.target.value || undefined })}
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

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={saving} disabled={!valid}>
          Save
        </Button>
      </div>
    </form>
  );
}

export function RolesPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(listRoles);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>(
    'all'
  );
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const roles = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles.filter((r) => {
      if (activeFilter === 'active' && !r.isActive) return false;
      if (activeFilter === 'inactive' && r.isActive) return false;
      if (!q) return true;
      return [r.code, r.name, r.category, r.roleFamily, r.solutionArea]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [roles, search, activeFilter]);

  async function handleSave(input: RoleInput) {
    setSaving(true);
    try {
      if (editing) {
        await updateRole(editing.id, input);
        toast('Role updated.', 'success');
      } else {
        await createRole(input);
        toast('Role created.', 'success');
      }
      setEditing(null);
      setCreating(false);
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
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setCreating(true);
              }}
            >
              + New role
            </Button>
          </Tooltip>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <div className="relative min-w-0 flex-1">
            <Input
              placeholder="Search code, name, family…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            className="w-44"
            value={activeFilter}
            onChange={(e) =>
              setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')
            }
          >
            <option value="all">All</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" label="Loading roles…" />
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load roles" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No roles found"
            description={
              roles.length === 0
                ? 'Create your first role.'
                : 'Try adjusting your search or filters.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Family</th>
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
                      <p className="font-medium text-gray-900">
                        {r.name}
                        <span className="ml-1 text-xs text-gray-400">
                          {r.code}
                        </span>
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {r.category ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.roleFamily ?? '—'}
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
                      <Badge tone={r.isActive ? 'green' : 'slate'}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {fmtRelative(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip label="このロールを編集します">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setCreating(false);
                              setEditing(r);
                            }}
                          >
                            Edit
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? `Edit ${editing.code}` : 'New role'}
        size="lg"
      >
        <RoleForm
          initial={editing ? snapshot(editing) : EMPTY}
          saving={saving}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={handleSave}
        />
      </Modal>
    </div>
  );
}
