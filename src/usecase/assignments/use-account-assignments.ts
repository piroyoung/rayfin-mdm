/**
 * Assignments screen view-model. Loads reference data + the selected account's
 * placements and derives its role coverage from the territory roster (current
 * and previous fiscal year) through the domain roster policy. Owns the account /
 * fiscal-year selection and the two placement actions (place, retire), which run
 * through the shared placement operations. The page and cards render only.
 */
import { useEffect, useMemo, useState } from 'react';

import { canTransition } from '@/domain/assignmentWorkflow';
import {
  currentTerritoryIdsForAccount,
  deriveAccountTeam,
  type DerivedAccountRole,
} from '@/domain/territoryRoster';
import type {
  Account,
  Employee,
  FiscalYear,
  Role,
  Territory,
  TerritoryAccountAssignment,
  TerritoryRoleAssignment,
} from '@/domain/types';
import { useDependencies } from '@/di/dependencies-context';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useToast } from '@/usecase/shared/toast-context';
import {
  advancePlacementStatus,
  createPlacement,
  type PlacementDeps,
} from '@/usecase/assignments/placement-operations';

interface RefData {
  accounts: Account[];
  fiscalYears: FiscalYear[];
  roles: Role[];
  employees: Employee[];
  territories: Territory[];
}

interface AccountAssignments {
  /** Territory placements for the selected fiscal year. */
  territory: TerritoryAccountAssignment[];
  /** All placements across fiscal years (used to derive teams per FY). */
  allTerritory: TerritoryAccountAssignment[];
  /** Roster seats of the selected-FY territories this account sits in. */
  territoryRoles: TerritoryRoleAssignment[];
  /** Roster seats of the previous-FY territories, for FY comparison. */
  prevTerritoryRoles: TerritoryRoleAssignment[];
}

const EMPTY_ASSIGNMENTS: AccountAssignments = {
  territory: [],
  allTerritory: [],
  territoryRoles: [],
  prevTerritoryRoles: [],
};

const PLACEMENT_BUSY_ID = 'territory-placement';

export interface CoverageComparisonRow {
  roleTypeCode: string;
  currentEmployeeId?: string;
  previousEmployeeId?: string;
  changed: boolean;
}

export function useAccountAssignments() {
  const {
    accounts: accountRepo,
    fiscalYears: fiscalYearRepo,
    roles: roleRepo,
    employees: employeeRepo,
    territories: territoryRepo,
    territoryAccountAssignments,
    territoryRoleAssignments,
    audit,
  } = useDependencies();
  const toast = useToast();
  const placementDeps: PlacementDeps = { territoryAccountAssignments, audit };

  const { data: refs, loading: refsLoading } = useAsyncData<RefData>(async () => {
    const [accounts, fiscalYears, roles, employees, territories] =
      await Promise.all([
        accountRepo.list(),
        fiscalYearRepo.list(),
        roleRepo.listAccountAssignable(),
        employeeRepo.list(),
        territoryRepo.list(),
      ]);
    return { accounts, fiscalYears, roles, employees, territories };
  }, []);

  const accounts = useMemo(() => refs?.accounts ?? [], [refs]);
  const fiscalYears = useMemo(() => refs?.fiscalYears ?? [], [refs]);
  const roles = useMemo(() => refs?.roles ?? [], [refs]);
  const employees = useMemo(() => refs?.employees ?? [], [refs]);
  const territories = useMemo(() => refs?.territories ?? [], [refs]);

  const [accountId, setAccountId] = useState('');
  const [fyId, setFyId] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Default the fiscal year to the current one once refs load.
  useEffect(() => {
    if (fyId || fiscalYears.length === 0) return;
    const current = fiscalYears.find((fy) => fy.isCurrent) ?? fiscalYears[0];
    setFyId(current.id);
  }, [fiscalYears, fyId]);

  // Previous fiscal year (immediately before the selected one in sort order).
  const prevFiscalYear = useMemo(() => {
    const idx = fiscalYears.findIndex((fy) => fy.id === fyId);
    return idx > 0 ? fiscalYears[idx - 1] : undefined;
  }, [fiscalYears, fyId]);

  const {
    data: assignmentData,
    loading: assignmentsLoading,
    reload,
  } = useAsyncData<AccountAssignments>(async () => {
    if (!accountId) return EMPTY_ASSIGNMENTS;
    const allTerritory =
      await territoryAccountAssignments.listForAccount(accountId);
    const fyTerritory = fyId
      ? allTerritory.filter((t) => t.fiscalYearId === fyId)
      : allTerritory;

    const loadRoster = async (
      someFyId?: string
    ): Promise<TerritoryRoleAssignment[]> => {
      if (!someFyId) return [];
      const ids = currentTerritoryIdsForAccount(
        accountId,
        someFyId,
        allTerritory
      );
      const lists = await Promise.all(
        ids.map((tid) =>
          territoryRoleAssignments.listForTerritory(tid, someFyId)
        )
      );
      return lists.flat();
    };

    const [territoryRoles, prevTerritoryRoles] = await Promise.all([
      loadRoster(fyId || undefined),
      loadRoster(prevFiscalYear?.id),
    ]);

    return { territory: fyTerritory, allTerritory, territoryRoles, prevTerritoryRoles };
  }, [accountId, fyId, prevFiscalYear?.id]);

  const assignments = assignmentData ?? EMPTY_ASSIGNMENTS;

  const empName = useMemo(() => {
    const map = new Map(employees.map((e) => [e.id, e]));
    return (id: string) => {
      const e = map.get(id);
      if (!e) return id;
      return e.alias ? `${e.displayName} (${e.alias})` : e.displayName;
    };
  }, [employees]);
  const roleName = useMemo(() => {
    const map = new Map(roles.map((r) => [r.code, r.name]));
    return (code: string) => map.get(code) ?? code;
  }, [roles]);
  const terrCode = useMemo(() => {
    const map = new Map(territories.map((t) => [t.id, t.territoryCode]));
    return (id?: string) => (id ? (map.get(id) ?? '—') : '—');
  }, [territories]);

  // Derived account team for the selected FY, read from its territory roster.
  const derivedTeam = useMemo<DerivedAccountRole[]>(() => {
    if (!accountId || !fyId) return [];
    return deriveAccountTeam({
      accountId,
      fiscalYearId: fyId,
      territoryAssignments: assignments.allTerritory,
      territoryRoleAssignments: assignments.territoryRoles,
    });
  }, [accountId, fyId, assignments]);

  // Derived team for the previous FY, for the side-by-side comparison.
  const prevTeam = useMemo<DerivedAccountRole[]>(() => {
    if (!accountId || !prevFiscalYear) return [];
    return deriveAccountTeam({
      accountId,
      fiscalYearId: prevFiscalYear.id,
      territoryAssignments: assignments.allTerritory,
      territoryRoleAssignments: assignments.prevTerritoryRoles,
    });
  }, [accountId, prevFiscalYear, assignments]);

  // Merge current + previous coverage by role for the comparison table.
  const comparison = useMemo<CoverageComparisonRow[]>(() => {
    const cur = new Map(derivedTeam.map((r) => [r.roleTypeCode, r.employeeId]));
    const prev = new Map(prevTeam.map((r) => [r.roleTypeCode, r.employeeId]));
    const codes = [...new Set([...cur.keys(), ...prev.keys()])].sort((a, b) =>
      a.localeCompare(b)
    );
    return codes.map((code) => {
      const current = cur.get(code);
      const previous = prev.get(code);
      return {
        roleTypeCode: code,
        currentEmployeeId: current,
        previousEmployeeId: previous,
        changed: (current ?? '') !== (previous ?? ''),
      };
    });
  }, [derivedTeam, prevTeam]);

  async function runAction(fn: () => Promise<unknown>, ok: string) {
    setBusyId(PLACEMENT_BUSY_ID);
    try {
      await fn();
      toast(ok, 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const territoryPlacement = assignments.territory.find((t) => t.currentFlag);

  function placeInTerritory(territoryId: string) {
    if (!territoryId || !fyId) return;
    void runAction(
      () =>
        createPlacement(placementDeps, {
          accountId,
          territoryId,
          fiscalYearId: fyId,
          assignmentStatus: 'active',
        }),
      'Territory placement set.'
    );
  }

  function retirePlacement() {
    if (!territoryPlacement) return;
    void runAction(
      () => advancePlacementStatus(placementDeps, territoryPlacement, 'retired'),
      'Territory placement retired.'
    );
  }

  return {
    refsLoading,
    assignmentsLoading,
    accounts,
    fiscalYears,
    territories,
    accountId,
    setAccountId,
    fyId,
    setFyId,
    prevFiscalYear,
    territoryPlacement,
    canRetirePlacement:
      !!territoryPlacement &&
      canTransition(territoryPlacement.assignmentStatus, 'retired'),
    placementBusy: busyId === PLACEMENT_BUSY_ID,
    derivedTeam,
    comparison,
    empName,
    roleName,
    terrCode,
    placeInTerritory,
    retirePlacement,
  };
}
