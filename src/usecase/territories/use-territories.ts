/**
 * Territories screen view-model. Loads the territory master and fiscal years
 * through injected repository ports, owns search / CRUD-modal state, and
 * orchestrates create / update (with parent-cycle validation) and
 * activate / retire with audit logging, toasts, and reload. The page and its
 * components stay presentational.
 */
import { useMemo, useState } from 'react';

import { territoryLabel, territorySnapshot } from '@/domain/models/territory';
import { territoryWouldCreateCycle } from '@/domain/policies/territory-hierarchy';
import type { TerritoryInput } from '@/domain/repositories/territory-repository';
import type { FiscalYear, Territory } from '@/domain/types';
import { useDependencies } from '@/di/dependencies-context';
import { lookupFn } from '@/lib/listing';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useCrudForm } from '@/usecase/shared/use-crud-form';
import { useToast } from '@/usecase/shared/toast-context';

import { filterTerritories } from './selectors';

interface TerritoryPageData {
  territories: Territory[];
  fiscalYears: FiscalYear[];
}

export function useTerritories() {
  const { territories: repo, fiscalYears: fiscalYearRepo, audit } =
    useDependencies();
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData<TerritoryPageData>(
    async () => {
      const [territories, fiscalYears] = await Promise.all([
        repo.list(),
        fiscalYearRepo.list(),
      ]);
      return { territories, fiscalYears };
    },
    []
  );

  const [search, setSearch] = useState('');
  const form = useCrudForm<Territory, TerritoryInput>();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const territories = useMemo(() => data?.territories ?? [], [data]);
  const fiscalYears = useMemo(() => data?.fiscalYears ?? [], [data]);
  const filtered = useMemo(
    () => filterTerritories(territories, search),
    [territories, search]
  );
  const fyCode = useMemo(
    () =>
      lookupFn(
        fiscalYears,
        (fy) => fy.id,
        (fy) => fy.code,
        () => '—'
      ),
    [fiscalYears]
  );

  async function save(input: TerritoryInput) {
    setSaving(true);
    try {
      if (form.editing) {
        if (
          input.parentTerritoryId &&
          territoryWouldCreateCycle(
            territories,
            form.editing.id,
            input.parentTerritoryId
          )
        ) {
          throw new Error('A territory cannot be its own ancestor.');
        }
        await repo.update(form.editing.id, input);
        await audit.log({
          domain: 'territory',
          action: 'update',
          recordId: form.editing.id,
          recordLabel: territoryLabel(input),
          summary: `Updated territory ${input.territoryCode}`,
        });
        toast('Territory updated.', 'success');
      } else {
        const created = await repo.create(input);
        await audit.log({
          domain: 'territory',
          action: 'create',
          recordId: created.id,
          recordLabel: territoryLabel(input),
          summary: `Created territory ${input.territoryCode}`,
        });
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
      await repo.setActive(t.id, !t.isActive);
      await audit.log({
        domain: 'territory',
        action: 'status_change',
        recordId: t.id,
        recordLabel: territoryLabel(t),
        summary: `Territory ${t.territoryCode} → ${t.isActive ? 'inactive' : 'active'}`,
      });
      toast(`Territory ${t.isActive ? 'deactivated' : 'activated'}.`, 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return {
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
    snapshot: territorySnapshot,
  };
}
