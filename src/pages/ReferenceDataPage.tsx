/** Reference Data: governed code lists grouped by set. */
import { useMemo, useState } from 'react';

import {
  createReference,
  deleteReference,
  groupReference,
  listReference,
  updateReference,
  type ReferenceInput,
} from '@/services/reference';
import type { ReferenceValue } from '@/domain/types';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useToast } from '@/usecase/shared/toast-context';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Tooltip,
} from '@/components/ui';

const EMPTY: ReferenceInput = {
  setName: '',
  code: '',
  label: '',
  isActive: true,
  sortOrder: 0,
};

function ReferenceForm({
  initial,
  knownSets,
  saving,
  onCancel,
  onSubmit,
}: {
  initial: ReferenceInput;
  knownSets: string[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: ReferenceInput) => void;
}) {
  const [form, setForm] = useState<ReferenceInput>(initial);
  const [newSet, setNewSet] = useState(
    initial.setName === '' || !knownSets.includes(initial.setName)
  );
  const set = (patch: Partial<ReferenceInput>) =>
    setForm((f) => ({ ...f, ...patch }));

  const valid =
    (form.setName ?? '').trim() !== '' &&
    (form.code ?? '').trim() !== '' &&
    (form.label ?? '').trim() !== '';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="List / set">
          {knownSets.length > 0 && !newSet ? (
            <div className="flex gap-2">
              <Select
                value={form.setName}
                onChange={(e) => set({ setName: e.target.value })}
              >
                <option value="">Select…</option>
                {knownSets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Tooltip label="新しいリスト（セット）を作成します" side="bottom">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNewSet(true);
                    set({ setName: '' });
                  }}
                >
                  New
                </Button>
              </Tooltip>
            </div>
          ) : (
            <Input
              value={form.setName}
              onChange={(e) => set({ setName: e.target.value })}
              placeholder="e.g. country"
            />
          )}
        </Field>
        <Field label="Sort order">
          <Input
            type="number"
            value={form.sortOrder ?? 0}
            onChange={(e) => set({ sortOrder: Number(e.target.value) })}
          />
        </Field>
        <Field label="Code" required>
          <Input
            value={form.code}
            onChange={(e) => set({ code: e.target.value })}
            placeholder="US"
            required
          />
        </Field>
        <Field label="Label" required>
          <Input
            value={form.label}
            onChange={(e) => set({ label: e.target.value })}
            placeholder="United States"
            required
          />
        </Field>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={form.isActive ?? true}
          onChange={(e) => set({ isActive: e.target.checked })}
        />
        Active
      </label>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          loading={saving}
          disabled={!valid}
        >
          Save
        </Button>
      </div>
    </form>
  );
}

export function ReferenceDataPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(listReference);

  const [editing, setEditing] = useState<ReferenceValue | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ReferenceValue | null>(null);

  const groups = useMemo(() => groupReference(data ?? []), [data]);
  const knownSets = useMemo(
    () => groups.map((g) => g.setName),
    [groups]
  );

  async function handleSave(input: ReferenceInput) {
    setSaving(true);
    try {
      if (editing) {
        await updateReference(editing.id, input);
        toast('Reference value updated.', 'success');
      } else {
        await createReference(input);
        toast('Reference value added.', 'success');
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

  async function handleDelete(record: ReferenceValue) {
    setBusyId(record.id);
    try {
      await deleteReference(record);
      toast('Reference value deleted.', 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed.', 'error');
    } finally {
      setBusyId(null);
      setToDelete(null);
    }
  }

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
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setCreating(true);
              }}
            >
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
        <div className="grid gap-5 md:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.setName} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  {group.setName}
                </h2>
                <span className="text-xs text-gray-500">
                  {group.values.length} value
                  {group.values.length > 1 ? 's' : ''}
                </span>
              </div>
              <ul className="divide-y divide-gray-50">
                {group.values.map((value) => (
                  <li
                    key={value.id}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50/60"
                  >
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                      {value.code}
                    </code>
                    <span className="min-w-0 flex-1 truncate text-gray-800">
                      {value.label}
                    </span>
                    {!value.isActive && <Badge tone="gray">Inactive</Badge>}
                    <Tooltip label="この参照値を編集します">
                      <button
                        type="button"
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                        onClick={() => {
                          setCreating(false);
                          setEditing(value);
                        }}
                      >
                        Edit
                      </button>
                    </Tooltip>
                    <Tooltip label="この参照値を削除します">
                      <button
                        type="button"
                        className="text-xs font-medium text-red-600 hover:text-red-500 disabled:opacity-50"
                        disabled={busyId === value.id}
                        onClick={() => setToDelete(value)}
                      >
                        Delete
                      </button>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Edit reference value' : 'New reference value'}
      >
        <ReferenceForm
          initial={
            editing
              ? {
                  setName: editing.setName,
                  code: editing.code,
                  label: editing.label,
                  parentId: editing.parentId,
                  sortOrder: editing.sortOrder ?? 0,
                  isActive: editing.isActive,
                }
              : EMPTY
          }
          knownSets={knownSets}
          saving={saving}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={handleSave}
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
        onConfirm={() => toDelete && void handleDelete(toDelete)}
      />
    </div>
  );
}
