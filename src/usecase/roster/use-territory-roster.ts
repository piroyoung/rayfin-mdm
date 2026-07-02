/**
 * Territory Roster screen view-model. Loads reference data (territories, fiscal
 * years, account-assignable roles, employees) through injected repositories,
 * owns the territory / fiscal-year selection and the per-seat busy state, and
 * orchestrates staffing, reassignment, status transitions, and vacating a seat
 * through the shared role-seat operations. The page stays presentational.
 */
import { useEffect, useMemo, useState } from 'react';

import { territoryRoleScopeKey } from '@/domain/territoryRoster';
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
import { useToast } from '@/usecase/shared/toast-context';
import {
  advanceSeatStatus,
  clearSeat,
  setSeatMember,
} from '@/usecase/assignments/role-seat-operations';

interface RosterRefs {
  territories: Territory[];
  fiscalYears: FiscalYear[];
  roles: Role[];
  employees: Employee[];
}

export function useTerritoryRoster() {
  const {
    territories: territoryRepo,
    fiscalYears: fiscalYearRepo,
    roles: roleRepo,
    employees: employeeRepo,
    territoryRoleAssignments,
    audit,
  } = useDependencies();
  const toast = useToast();

  const { data: refs, loading: refsLoading } = useAsyncData<RosterRefs>(
    async () => {
      const [territories, fiscalYears, roles, employees] = await Promise.all([
        territoryRepo.list(),
        fiscalYearRepo.list(),
        roleRepo.listAccountAssignable(),
        employeeRepo.list(),
      ]);
      return { territories, fiscalYears, roles, employees };
    },
    []
  );

  const territories = useMemo(() => refs?.territories ?? [], [refs]);
  const fiscalYears = useMemo(() => refs?.fiscalYears ?? [], [refs]);
  const roles = useMemo(() => refs?.roles ?? [], [refs]);
  const employees = useMemo(() => refs?.employees ?? [], [refs]);

  const employeeById = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );
  const activeEmployees = useMemo(
    () =>
      [...employees]
        .filter((e) => e.isActive)
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [employees]
  );

  const [territoryId, setTerritoryId] = useState('');
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [seats, setSeats] = useState<TerritoryRoleAssignment[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [busyRole, setBusyRole] = useState<string | null>(null);

  // Default the selectors once reference data arrives.
  useEffect(() => {
    if (!territoryId && territories.length) setTerritoryId(territories[0].id);
  }, [territories, territoryId]);
  useEffect(() => {
    if (fiscalYearId || !fiscalYears.length) return;
    const fy =
      fiscalYears.find((f) => f.isCurrent) ?? fiscalYears[fiscalYears.length - 1];
    if (fy) setFiscalYearId(fy.id);
  }, [fiscalYears, fiscalYearId]);

  async function reloadSeats() {
    if (!territoryId || !fiscalYearId) {
      setSeats([]);
      return;
    }
    setLoadingSeats(true);
    try {
      const rows = await territoryRoleAssignments.listForTerritory(
        territoryId,
        fiscalYearId
      );
      setSeats(rows);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Load failed.', 'error');
    } finally {
      setLoadingSeats(false);
    }
  }

  useEffect(() => {
    void reloadSeats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [territoryId, fiscalYearId]);

  /** The current seat holder row for a role, if any. */
  const seatFor = (
    roleTypeCode: string
  ): TerritoryRoleAssignment | undefined => {
    const key = territoryRoleScopeKey({ territoryId, roleTypeCode, fiscalYearId });
    return seats.find((s) => s.currentFlag && territoryRoleScopeKey(s) === key);
  };

  async function assign(roleTypeCode: string, employeeId: string) {
    if (!territoryId || !fiscalYearId) return;
    setBusyRole(roleTypeCode);
    try {
      if (!employeeId) {
        const seat = seatFor(roleTypeCode);
        if (seat) {
          await clearSeat({ territoryRoleAssignments, audit }, seat);
          toast('Seat vacated.', 'success');
        }
      } else {
        await setSeatMember(
          { territoryRoleAssignments, audit },
          seats,
          { territoryId, roleTypeCode, fiscalYearId },
          employeeId
        );
        toast('Seat updated.', 'success');
      }
      await reloadSeats();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed.', 'error');
    } finally {
      setBusyRole(null);
    }
  }

  async function advance(
    seat: TerritoryRoleAssignment,
    status: AssignmentStatus
  ) {
    setBusyRole(seat.roleTypeCode);
    try {
      await advanceSeatStatus({ territoryRoleAssignments, audit }, seat, status);
      await reloadSeats();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed.', 'error');
    } finally {
      setBusyRole(null);
    }
  }

  const territory = territories.find((t) => t.id === territoryId);
  const filledSeats = roles.filter((r) => seatFor(r.code)).length;

  return {
    loading: refsLoading || loadingSeats,
    territories,
    fiscalYears,
    roles,
    territoryId,
    setTerritoryId,
    fiscalYearId,
    setFiscalYearId,
    territory,
    filledSeats,
    seatFor,
    employeeById,
    activeEmployees,
    busyRole,
    assign,
    advance,
  };
}
