/** Territories: list, search, CRUD with parent / fiscal-year selects. */
import { useMemo, useState } from 'react';

import {
  createTerritory,
  listTerritories,
  setTerritoryActive,
  updateTerritory,
  type TerritoryInput,
} from '@/services/territories';
import { listFiscalYears } from '@/services/fiscalYears';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useToast } from '@/hooks/useToast';
import type { FiscalYear, Territory } from '@/domain/types';
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
  Tooltip,
} from '@/components/ui';

interface TerritoryPageData {
  territories: Territory[];
  fiscalYears: FiscalYear[];
}

const loadTerritoryPage = async (): Promise<TerritoryPageData> => {
  const [territories, fiscalYears] = await Promise.all([
    listTerritories(),
    listFiscalYears(),
  ]);
  return { territories, fiscalYears };
};

const EMPTY: TerritoryInput = { territoryCode: '', territoryName: '' };

function snapshot(t: Territory): TerritoryInput {
  return {
    territoryCode: t.territoryCode,
    territoryName: t.territoryName,
    territoryType: t.territoryType,
    parentTerritoryId: t.parentTerritoryId,
    fiscalYearId: t.fiscalYearId,
    segmentCode: t.segmentCode,
    industryCode: t.industryCode,
    region: t.region,
    countryCode: t.countryCode,
    isActive: t.isActive,
  };
}

function TerritoryForm({
  initial,
  selfId,
  territories,
  fiscalYears,
  saving,
  onCancel,
  onSubmit,
}: {
  initial: TerritoryInput;
  selfId?: string;
  territories: Territory[];
  fiscalYears: FiscalYear[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: TerritoryInput) => void;
}) {
  const [form, setForm] = useState<TerritoryInput>(initial);
  const set = (patch: Partial<TerritoryInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const valid =
    (form.territoryCode ?? '').trim() !== '' &&
    (form.territoryName ?? '').trim() !== '';

  const parentOptions = territories.filter((t) => t.id !== selfId);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Territory code" required>
          <Input
            value={form.territoryCode}
            onChange={(e) => set({ territoryCode: e.target.value })}
            placeholder="JPN.SMECC.RTL.0303"
            required
          />
        </Field>
        <Field label="Territory name" required>
          <Input
            value={form.territoryName}
            onChange={(e) => set({ territoryName: e.target.value })}
            placeholder="Japan POD #03"
            required
          />
        </Field>
        <Field label="Type" hint="POD, SALES_TERRITORY, SEGMENT…">
          <Input
            value={form.territoryType ?? ''}
            onChange={(e) => set({ territoryType: e.target.value })}
          />
        </Field>
        <Field label="Fiscal year">
          <Select
            value={form.fiscalYearId ?? ''}
            onChange={(e) =>
              set({ fiscalYearId: e.target.value || undefined })
            }
          >
            <option value="">— none —</option>
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                {fy.code}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Parent territory">
          <Select
            value={form.parentTerritoryId ?? ''}
            onChange={(e) =>
              set({ parentTerritoryId: e.target.value || undefined })
            }
          >
            <option value="">— none —</option>
            {parentOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.territoryCode} — {t.territoryName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Segment code">
          <Input
            value={form.segmentCode ?? ''}
            onChange={(e) => set({ segmentCode: e.target.value })}
          />
        </Field>
        <Field label="Industry code">
          <Input
            value={form.industryCode ?? ''}
            onChange={(e) => set({ industryCode: e.target.value })}
          />
        </Field>
        <Field label="Region">
          <Input
            value={form.region ?? ''}
            onChange={(e) => set({ region: e.target.value })}
          />
        </Field>
        <Field label="Country code" hint="ISO-2, e.g. JP">
          <Input
            value={form.countryCode ?? ''}
            maxLength={2}
            onChange={(e) => set({ countryCode: e.target.value.toUpperCase() })}
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

export function TerritoriesPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(loadTerritoryPage);

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Territory | null>(null);
  const [creating, setCreating] = useState(false);
  const [seed, setSeed] = useState<TerritoryInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const territories = useMemo(() => data?.territories ?? [], [data]);
  const fiscalYears = useMemo(() => data?.fiscalYears ?? [], [data]);

  const fyCode = useMemo(() => {
    const map = new Map(fiscalYears.map((fy) => [fy.id, fy.code]));
    return (id?: string) => (id ? (map.get(id) ?? '—') : '—');
  }, [fiscalYears]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return territories;
    return territories.filter((t) =>
      [t.territoryCode, t.territoryName, t.territoryType, t.region]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [territories, search]);

  async function handleSave(input: TerritoryInput) {
    setSaving(true);
    try {
      if (editing) {
        await updateTerritory(editing.id, input);
        toast('Territory updated.', 'success');
      } else {
        await createTerritory(input);
        toast('Territory created.', 'success');
      }
      setEditing(null);
      setCreating(false);
      setSeed(null);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t: Territory) {
    setBusyId(t.id);
    try {
      await setTerritoryActive(t, !t.isActive);
      toast(`Territory ${t.isActive ? 'deactivated' : 'activated'}.`, 'success');
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
        title="Territories"
        subtitle="Territory / POD / sales-unit master, scoped by fiscal year."
        actions={
          <Tooltip label="新しいテリトリーを作成します" side="bottom">
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setSeed(null);
                setCreating(true);
              }}
            >
              + New territory
            </Button>
          </Tooltip>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <div className="relative min-w-0 flex-1">
            <Input
              placeholder="Search code, name, type, region…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" label="Loading territories…" />
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load territories" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No territories found"
            description={
              territories.length === 0
                ? 'Create your first territory.'
                : 'Try adjusting your search.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th className="px-4 py-3">Territory</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Fiscal year</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <p className="truncate font-medium text-gray-900">
                        {t.territoryName}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {t.territoryCode}
                        {t.region ? ` · ${t.region}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.territoryType ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {fyCode(t.fiscalYearId)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={t.isActive ? 'green' : 'slate'}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip label="このテリトリーを編集します">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSeed(null);
                              setCreating(false);
                              setEditing(t);
                            }}
                          >
                            Edit
                          </Button>
                        </Tooltip>
                        <Tooltip label="この行をコピーして新しいテリトリーを作成します">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(null);
                              setSeed({ ...snapshot(t), territoryCode: '' });
                              setCreating(true);
                            }}
                          >
                            Copy
                          </Button>
                        </Tooltip>
                        <Tooltip
                          label={
                            t.isActive
                              ? 'このテリトリーを無効化します'
                              : 'このテリトリーを有効化します'
                          }
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={busyId === t.id}
                            onClick={() => toggleActive(t)}
                          >
                            {t.isActive ? 'Deactivate' : 'Activate'}
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
          setSeed(null);
        }}
        title={
          editing
            ? `Edit ${editing.territoryName}`
            : seed
              ? 'New territory (copy)'
              : 'New territory'
        }
        size="lg"
      >
        <TerritoryForm
          initial={editing ? snapshot(editing) : (seed ?? EMPTY)}
          selfId={editing?.id}
          territories={territories}
          fiscalYears={fiscalYears}
          saving={saving}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
            setSeed(null);
          }}
          onSubmit={handleSave}
        />
      </Modal>
    </div>
  );
}
