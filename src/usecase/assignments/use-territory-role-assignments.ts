/**
 * TerritoryRoleAssignment screen view-model: direct edit of the role-seat roster
 * rows. Loads rows + reference data through injected repositories, owns the
 * create-form / confirm / busy state, derives the id→label lookups and the
 * updated-desc ordering, and orchestrates create, status transitions, and
 * vacate through the shared role-seat operations. The page renders only.
 */
import { useMemo, useState } from 'react';

import { lookupFn } from '@/lib/listing';
import type { TerritoryRoleAssignmentInput } from '@/domain/repositories/territory-role-assignment-repository';
import type {
  AssignmentStatus,
  Employee,
  FiscalYear,
  Role,
  Territory,
  TerritoryRoleAssignment,
} from '@/domain/types';
import { useDependencies } from '@/di/dependencies-context';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useCrudForm } from '@/usecase/shared/use-crud-form';
import { useToast } from '@/usecase/shared/toast-context';
import {
  advanceSeatStatus,
  clearSeat,
  createSeat,
  type RoleSeatDeps,
} from '@/usecase/assignments/role-seat-operations';

interface PageData {
  rows: TerritoryRoleAssignment[];
  territories: Territory[];
  employees: Employee[];
  fiscalYears: FiscalYear[];
  roles: Role[];
}

export const EMPTY_SEAT: TerritoryRoleAssignmentInput = {
  territoryId: '',
  employeeId: '',
  fiscalYearId: '',
  roleTypeCode: '',
};

export function seatSnapshot(
  r: TerritoryRoleAssignment
): TerritoryRoleAssignmentInput {
  return {
    territoryId: r.territoryId,
    employeeId: r.employeeId,
    fiscalYearId: r.fiscalYearId,
    roleTypeCode: r.roleTypeCode,
  };
}

export function useTerritoryRoleAssignments() {
  const {
    territoryRoleAssignments,
    territories: territoryRepo,
    employees: employeeRepo,
    fiscalYears: fiscalYearRepo,
    roles: roleRepo,
    audit,
  } = useDependencies();
  const toast = useToast();
  const seatDeps: RoleSeatDeps = { territoryRoleAssignments, audit };

  const { data, loading, error, reload } = useAsyncData<PageData>(async () => {
    const [rows, territories, employees, fiscalYears, roles] = await Promise.all(
      [
        territoryRoleAssignments.list(),
        territoryRepo.list(),
        employeeRepo.list(),
        fiscalYearRepo.list(),
        roleRepo.list(),
      ]
    );
    return { rows, territories, employees, fiscalYears, roles };
  }, []);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const territories = useMemo(() => data?.territories ?? [], [data]);
  const employees = useMemo(() => data?.employees ?? [], [data]);
  const fiscalYears = useMemo(() => data?.fiscalYears ?? [], [data]);
  const roles = useMemo(() => data?.roles ?? [], [data]);

  const form = useCrudForm<
    TerritoryRoleAssignment,
    TerritoryRoleAssignmentInput
  >();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<TerritoryRoleAssignment | null>(null);

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
  const empName = useMemo(
    () =>
      lookupFn(
        employees,
        (e) => e.id,
        (e) => (e.alias ? `${e.displayName} (${e.alias})` : e.displayName)
      ),
    [employees]
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
  const roleName = useMemo(
    () =>
      lookupFn(
        roles,
        (r) => r.code,
        (r) => r.name
      ),
    [roles]
  );

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [rows]
  );

  async function handleCreate(input: TerritoryRoleAssignmentInput) {
    setSaving(true);
    try {
      await createSeat(seatDeps, input);
      toast('Seat created.', 'success');
      form.close();
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Create failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function advance(row: TerritoryRoleAssignment, status: AssignmentStatus) {
    setBusyId(row.id);
    try {
      await advanceSeatStatus(seatDeps, row, status);
      toast(`Seat → ${status}.`, 'success');
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
      await clearSeat(seatDeps, target);
      toast('Seat vacated.', 'success');
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
    territories,
    employees,
    fiscalYears,
    roles,
    form,
    saving,
    busyId,
    toDelete,
    setToDelete,
    terrCode,
    empName,
    fyCode,
    roleName,
    handleCreate,
    advance,
    confirmDelete,
  };
}
