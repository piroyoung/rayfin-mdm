/**
 * Assignments: pick an account + fiscal year, then view its territory placement
 * and the role coverage *derived* from that territory's roster, side by side
 * with the previous fiscal year so reassignments are obvious.
 *
 * Coverage is never stored per account: people are decided on the Territory
 * Roster, and accounts inherit the roster of the territory they sit in.
 */
import { useEffect, useMemo, useState } from 'react';

import { listAccounts, accountName } from '@/services/accounts';
import { listFiscalYears } from '@/services/fiscalYears';
import { listAccountAssignableRoles } from '@/services/roles';
import { listEmployees } from '@/services/employees';
import { listTerritories } from '@/services/territories';
import { listTerritoryRoleAssignmentsForTerritory } from '@/services/territoryRoleAssignments';
import {
  createTerritoryAssignment,
  listTerritoryAssignmentsForAccount,
  setTerritoryAssignmentStatus,
} from '@/services/assignments';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useToast } from '@/usecase/shared/toast-context';
import { canTransition } from '@/domain/assignmentWorkflow';
import {
  currentTerritoryIdsForAccount,
  deriveAccountTeam,
  type DerivedAccountRole,
} from '@/domain/territoryRoster';
import {
  ASSIGNMENT_STATUS_META,
  tonedMeta,
  type TerritoryAccountAssignment,
  type TerritoryRoleAssignment,
  type Account,
  type Employee,
  type FiscalYear,
  type Role,
  type Territory,
} from '@/domain/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Select,
  Spinner,
} from '@/components/ui';

interface RefData {
  accounts: Account[];
  fiscalYears: FiscalYear[];
  roles: Role[];
  employees: Employee[];
  territories: Territory[];
}

const loadRefs = async (): Promise<RefData> => {
  const [accounts, fiscalYears, roles, employees, territories] =
    await Promise.all([
      listAccounts(),
      listFiscalYears(),
      listAccountAssignableRoles(),
      listEmployees(),
      listTerritories(),
    ]);
  return { accounts, fiscalYears, roles, employees, territories };
};

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

export function AssignmentsPage() {
  const toast = useToast();
  const { data: refs, loading: refsLoading } = useAsyncData(loadRefs);

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
    const allTerritory = await listTerritoryAssignmentsForAccount(accountId);
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
          listTerritoryRoleAssignmentsForTerritory(tid, someFyId)
        )
      );
      return lists.flat();
    };

    const [territoryRoles, prevTerritoryRoles] = await Promise.all([
      loadRoster(fyId || undefined),
      loadRoster(prevFiscalYear?.id),
    ]);

    return {
      territory: fyTerritory,
      allTerritory,
      territoryRoles,
      prevTerritoryRoles,
    };
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
  const comparison = useMemo(() => {
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

  async function runAction(
    id: string,
    fn: () => Promise<unknown>,
    ok: string
  ) {
    setBusyId(id);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        subtitle="Account coverage by role and fiscal year, derived from the territory roster. Compare this year's team with last year's."
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Account">
            <Select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">— select an account —</option>
              {accounts.map((c) => (
                <option key={c.id} value={c.id}>
                  {accountName(c)} ({c.accountNumber})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fiscal year">
            <Select value={fyId} onChange={(e) => setFyId(e.target.value)}>
              {fiscalYears.length === 0 && <option value="">—</option>}
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.code}
                  {fy.isCurrent ? ' (current)' : ''}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {refsLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Loading…" />
        </div>
      ) : !accountId ? (
        <EmptyState
          title="Select an account"
          description="Choose an account and fiscal year to view its coverage."
        />
      ) : (
        <>
          {/* Territory placement */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Territory placement
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {territoryPlacement
                    ? terrCode(territoryPlacement.territoryId)
                    : 'No territory placed for this fiscal year.'}
                </p>
              </div>
              {territoryPlacement && (
                <Badge
                  tone={
                    tonedMeta(
                      ASSIGNMENT_STATUS_META,
                      territoryPlacement.assignmentStatus
                    ).tone
                  }
                >
                  {
                    tonedMeta(
                      ASSIGNMENT_STATUS_META,
                      territoryPlacement.assignmentStatus
                    ).label
                  }
                </Badge>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="min-w-48 flex-1">
                <Select
                  value=""
                  disabled={!fyId}
                  onChange={(e) => {
                    const territoryId = e.target.value;
                    if (!territoryId) return;
                    void runAction(
                      'territory-placement',
                      () =>
                        createTerritoryAssignment({
                          accountId,
                          territoryId,
                          fiscalYearId: fyId,
                          assignmentStatus: 'active',
                        }),
                      'Territory placement set.'
                    );
                  }}
                >
                  <option value="">
                    {territoryPlacement
                      ? 'Move to territory…'
                      : 'Place in territory…'}
                  </option>
                  {territories.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.territoryCode} — {t.territoryName}
                    </option>
                  ))}
                </Select>
              </div>
              {territoryPlacement &&
                canTransition(
                  territoryPlacement.assignmentStatus,
                  'retired'
                ) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={busyId === 'territory-placement'}
                    onClick={() =>
                      runAction(
                        'territory-placement',
                        () =>
                          setTerritoryAssignmentStatus(
                            territoryPlacement,
                            'retired'
                          ),
                        'Territory placement retired.'
                      )
                    }
                  >
                    Retire
                  </Button>
                )}
            </div>
          </Card>

          {/* Derived team (from territory roster) */}
          <Card>
            <div className="border-b border-gray-100 p-4">
              <p className="text-sm font-medium text-gray-700">
                Team — derived from territory roster
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Who covers this account per role, read from the roster of the
                account&apos;s territory. Staff seats on the Territory Roster
                page.
              </p>
            </div>
            {assignmentsLoading ? (
              <div className="flex justify-center py-12">
                <Spinner label="Deriving team…" />
              </div>
            ) : derivedTeam.length === 0 ? (
              <EmptyState
                title="No derived coverage"
                description="Place this account in a territory and staff that territory's roster to see coverage here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Territory</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {derivedTeam.map((row) => (
                      <tr key={row.roleTypeCode} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">
                            {roleName(row.roleTypeCode)}
                          </span>
                          <span className="ml-1 text-xs text-gray-400">
                            {row.roleTypeCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {empName(row.employeeId)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone="blue">{terrCode(row.territoryId)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* FY-over-FY comparison — last year's owner next to this year's. */}
          {prevFiscalYear && (
            <Card>
              <div className="border-b border-gray-100 p-4">
                <p className="text-sm font-medium text-gray-700">
                  Coverage vs {prevFiscalYear.code}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  This year&apos;s member next to last year&apos;s, per role —
                  the workbook&apos;s <code>*_Change</code> columns.
                </p>
              </div>
              {assignmentsLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner label="Comparing…" />
                </div>
              ) : comparison.length === 0 ? (
                <EmptyState
                  title="Nothing to compare"
                  description="No roster coverage in either fiscal year for this account."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">{prevFiscalYear.code}</th>
                        <th className="px-4 py-3">This year</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {comparison.map((row) => (
                        <tr
                          key={row.roleTypeCode}
                          className="hover:bg-gray-50/60"
                        >
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">
                              {roleName(row.roleTypeCode)}
                            </span>
                            <span className="ml-1 text-xs text-gray-400">
                              {row.roleTypeCode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {row.previousEmployeeId
                              ? empName(row.previousEmployeeId)
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {row.currentEmployeeId
                              ? empName(row.currentEmployeeId)
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.changed && (
                              <Badge tone="amber">Changed</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
