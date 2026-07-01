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
import { useCrudForm } from '@/hooks/useCrudForm';
import { useToast } from '@/hooks/useToast';
import { lookupFn } from '@/lib/listing';
import type { FiscalYear, Territory } from '@/domain/types';
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Tooltip,
} from '@/components/ui';
import {
  FormActions,
  ListCard,
  ListToolbar,
  RowActions,
  StatusBadge,
} from '@/components/listing';

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

      <FormActions onCancel={onCancel} saving={saving} disabled={!valid} />
    </form>
  );
}

export function TerritoriesPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(loadTerritoryPage);

  const [search, setSearch] = useState('');
  const form = useCrudForm<Territory, TerritoryInput>();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const territories = useMemo(() => data?.territories ?? [], [data]);
  const fiscalYears = useMemo(() => data?.fiscalYears ?? [], [data]);

  const fyCode = useMemo(
    () => lookupFn(fiscalYears, (fy) => fy.id, (fy) => fy.code, () => '—'),
    [fiscalYears]
  );

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
      if (form.editing) {
        await updateTerritory(form.editing.id, input);
        toast('Territory updated.', 'success');
      } else {
        await createTerritory(input);
        toast('Territory created.', 'success');
      }
      form.close();
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
                      {fyCode(t.fiscalYearId ?? '')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={t.isActive} />
                    </td>
                    <td className="px-4 py-3">
                      <RowActions>
                        <Tooltip label="このテリトリーを編集します">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => form.startEdit(t)}
                          >
                            Edit
                          </Button>
                        </Tooltip>
                        <Tooltip label="この行をコピーして新しいテリトリーを作成します">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              form.startDuplicate({
                                ...snapshot(t),
                                territoryCode: '',
                              })
                            }
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
            ? `Edit ${form.editing.territoryName}`
            : form.mode === 'duplicate'
              ? 'New territory (copy)'
              : 'New territory'
        }
        size="lg"
      >
        <TerritoryForm
          initial={form.editing ? snapshot(form.editing) : (form.seed ?? EMPTY)}
          selfId={form.editing?.id}
          territories={territories}
          fiscalYears={fiscalYears}
          saving={saving}
          onCancel={form.close}
          onSubmit={handleSave}
        />
      </Modal>
    </div>
  );
}
