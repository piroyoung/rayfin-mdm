/**
 * TerritoryAccountAssignment screen view-model: direct edit of account →
 * territory placements. Loads rows + reference data through injected
 * repositories, owns the create-form / confirm / busy state, derives the
 * id→label lookups and the updated-desc ordering, and orchestrates create,
 * status transitions, and delete through the placement operations. The page
 * renders only.
 */
import { useMemo, useState } from 'react';

import { accountName } from '@/domain/models/account';
import { lookupFn } from '@/lib/listing';
import type { TerritoryAssignmentInput } from '@/domain/repositories/territory-account-assignment-repository';
import type {
  AssignmentStatus,
  Account,
  FiscalYear,
  Territory,
  TerritoryAccountAssignment,
} from '@/domain/types';
import { useDependencies } from '@/di/dependencies-context';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useCrudForm } from '@/usecase/shared/use-crud-form';
import { useToast } from '@/usecase/shared/toast-context';
import {
  advancePlacementStatus,
  createPlacement,
  deletePlacement,
  type PlacementDeps,
} from '@/usecase/assignments/placement-operations';

interface PageData {
  rows: TerritoryAccountAssignment[];
  accounts: Account[];
  territories: Territory[];
  fiscalYears: FiscalYear[];
}

export const EMPTY_PLACEMENT: TerritoryAssignmentInput = {
  accountId: '',
  territoryId: '',
  fiscalYearId: '',
};

export function placementSnapshot(
  r: TerritoryAccountAssignment
): TerritoryAssignmentInput {
  return {
    accountId: r.accountId,
    territoryId: r.territoryId,
    fiscalYearId: r.fiscalYearId,
    assignmentType: r.assignmentType,
  };
}

export function useTerritoryAccountAssignments() {
  const {
    territoryAccountAssignments,
    accounts: accountRepo,
    territories: territoryRepo,
    fiscalYears: fiscalYearRepo,
    audit,
  } = useDependencies();
  const toast = useToast();
  const placementDeps: PlacementDeps = { territoryAccountAssignments, audit };

  const { data, loading, error, reload } = useAsyncData<PageData>(async () => {
    const [rows, accounts, territories, fiscalYears] = await Promise.all([
      territoryAccountAssignments.list(),
      accountRepo.list(),
      territoryRepo.list(),
      fiscalYearRepo.list(),
    ]);
    return { rows, accounts, territories, fiscalYears };
  }, []);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const accounts = useMemo(() => data?.accounts ?? [], [data]);
  const territories = useMemo(() => data?.territories ?? [], [data]);
  const fiscalYears = useMemo(() => data?.fiscalYears ?? [], [data]);

  const form = useCrudForm<
    TerritoryAccountAssignment,
    TerritoryAssignmentInput
  >();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<TerritoryAccountAssignment | null>(
    null
  );

  const accName = useMemo(
    () =>
      lookupFn(
        accounts,
        (a) => a.id,
        (a) => accountName(a)
      ),
    [accounts]
  );
  const terrCode = useMemo(
    () =>
      lookupFn(
        territories,
        (t) => t.id,
        (t) => t.territoryCode,
        () => '—'
      ),
    [territories]
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

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [rows]
  );

  async function handleCreate(input: TerritoryAssignmentInput) {
    setSaving(true);
    try {
      await createPlacement(placementDeps, input);
      toast('Placement created.', 'success');
      form.close();
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Create failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function advance(
    row: TerritoryAccountAssignment,
    status: AssignmentStatus
  ) {
    setBusyId(row.id);
    try {
      await advancePlacementStatus(placementDeps, row, status);
      toast(`Placement → ${status}.`, 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const target = toDelete;
    setBusyId(target.id);
    try {
      await deletePlacement(placementDeps, target);
      toast('Placement removed.', 'success');
      setToDelete(null);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return {
    loading,
    error,
    sorted,
    accounts,
    territories,
    fiscalYears,
    form,
    saving,
    busyId,
    toDelete,
    setToDelete,
    accName,
    terrCode,
    fyCode,
    handleCreate,
    advance,
    confirmDelete,
  };
}
