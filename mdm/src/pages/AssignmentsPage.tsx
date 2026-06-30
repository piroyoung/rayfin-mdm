/**
 * Assignments: pick an account + fiscal year, then manage its role coverage
 * (account ↔ employee) and territory placement (account ↔ territory). This is
 * the row-normalised replacement for the wide Excel role columns.
 */
import { useEffect, useMemo, useState } from 'react';

import { listCustomers } from '@/services/customers';
import { listFiscalYears } from '@/services/fiscalYears';
import { listAccountAssignableRoles } from '@/services/roleTypes';
import { listEmployees } from '@/services/employees';
import { listTerritories } from '@/services/territories';
import {
  createEmployeeAssignment,
  createTerritoryAssignment,
  deleteEmployeeAssignment,
  listEmployeeAssignmentsForAccount,
  listTerritoryAssignmentsForAccount,
  setEmployeeAssignmentStatus,
  setPrimaryEmployeeAssignment,
  setTerritoryAssignmentStatus,
} from '@/services/assignments';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useToast } from '@/hooks/useToast';
import {
  ASSIGNMENT_STATUS_META,
  tonedMeta,
  type AccountEmployeeAssignment,
  type AccountTerritoryAssignment,
  type Customer,
  type Employee,
  type FiscalYear,
  type RoleType,
  type Territory,
} from '@/domain/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Tooltip,
} from '@/components/ui';

interface RefData {
  customers: Customer[];
  fiscalYears: FiscalYear[];
  roles: RoleType[];
  employees: Employee[];
  territories: Territory[];
}

const loadRefs = async (): Promise<RefData> => {
  const [customers, fiscalYears, roles, employees, territories] =
    await Promise.all([
      listCustomers(),
      listFiscalYears(),
      listAccountAssignableRoles(),
      listEmployees(),
      listTerritories(),
    ]);
  return { customers, fiscalYears, roles, employees, territories };
};

interface AccountAssignments {
  employee: AccountEmployeeAssignment[];
  territory: AccountTerritoryAssignment[];
}

const EMPTY_ASSIGNMENTS: AccountAssignments = { employee: [], territory: [] };

function AddAssignmentForm({
  roles,
  employees,
  territories,
  saving,
  onCancel,
  onSubmit,
}: {
  roles: RoleType[];
  employees: Employee[];
  territories: Territory[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    employeeId: string;
    roleTypeCode: string;
    territoryId?: string;
    isPrimary: boolean;
  }) => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [roleTypeCode, setRoleTypeCode] = useState(roles[0]?.code ?? '');
  const [territoryId, setTerritoryId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const valid = employeeId !== '' && roleTypeCode !== '';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid)
          onSubmit({
            employeeId,
            roleTypeCode,
            territoryId: territoryId || undefined,
            isPrimary,
          });
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Employee" required>
          <Select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
          >
            <option value="">— select —</option>
            {employees
              .filter((emp) => emp.isActive)
              .map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.displayName}
                  {emp.alias ? ` (${emp.alias})` : ''}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Role" required>
          <Select
            value={roleTypeCode}
            onChange={(e) => setRoleTypeCode(e.target.value)}
            required
          >
            {roles.map((r) => (
              <option key={r.id} value={r.code}>
                {r.name} ({r.code})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Territory (optional)">
          <Select
            value={territoryId}
            onChange={(e) => setTerritoryId(e.target.value)}
          >
            <option value="">— none —</option>
            {territories.map((t) => (
              <option key={t.id} value={t.id}>
                {t.territoryCode}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Primary owner">
          <label className="flex h-9 items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Mark as the primary (lead) for this role
          </label>
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={saving} disabled={!valid}>
          Add assignment
        </Button>
      </div>
    </form>
  );
}

export function AssignmentsPage() {
  const toast = useToast();
  const { data: refs, loading: refsLoading } = useAsyncData(loadRefs);

  const customers = useMemo(() => refs?.customers ?? [], [refs]);
  const fiscalYears = useMemo(() => refs?.fiscalYears ?? [], [refs]);
  const roles = useMemo(() => refs?.roles ?? [], [refs]);
  const employees = useMemo(() => refs?.employees ?? [], [refs]);
  const territories = useMemo(() => refs?.territories ?? [], [refs]);

  const [accountId, setAccountId] = useState('');
  const [fyId, setFyId] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Default the fiscal year to the current one once refs load.
  useEffect(() => {
    if (fyId || fiscalYears.length === 0) return;
    const current = fiscalYears.find((fy) => fy.isCurrent) ?? fiscalYears[0];
    setFyId(current.id);
  }, [fiscalYears, fyId]);

  const {
    data: assignmentData,
    loading: assignmentsLoading,
    reload,
  } = useAsyncData<AccountAssignments>(async () => {
    if (!accountId) return EMPTY_ASSIGNMENTS;
    const [employee, territory] = await Promise.all([
      listEmployeeAssignmentsForAccount(accountId, fyId || undefined),
      listTerritoryAssignmentsForAccount(accountId),
    ]);
    return {
      employee,
      territory: fyId
        ? territory.filter((t) => t.fiscalYearId === fyId)
        : territory,
    };
  }, [accountId, fyId]);

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

  // Group employee assignments by role for the matrix view.
  const byRole = useMemo(() => {
    const groups = new Map<string, AccountEmployeeAssignment[]>();
    for (const a of assignments.employee) {
      const arr = groups.get(a.roleTypeCode) ?? [];
      arr.push(a);
      groups.set(a.roleTypeCode, arr);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [assignments.employee]);

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

  async function handleAdd(input: {
    employeeId: string;
    roleTypeCode: string;
    territoryId?: string;
    isPrimary: boolean;
  }) {
    setSaving(true);
    try {
      await createEmployeeAssignment({
        accountId,
        fiscalYearId: fyId,
        ...input,
      });
      // Enforce single-primary if the new row claims primary.
      if (input.isPrimary) {
        const rows = await listEmployeeAssignmentsForAccount(accountId, fyId);
        const justAdded = rows.find(
          (r) =>
            r.employeeId === input.employeeId &&
            r.roleTypeCode === input.roleTypeCode &&
            r.isPrimary
        );
        if (justAdded)
          await setPrimaryEmployeeAssignment(rows, justAdded.id);
      }
      toast('Assignment added.', 'success');
      setAdding(false);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Add failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const selectedAccount = customers.find((c) => c.id === accountId);
  const territoryPlacement = assignments.territory.find((t) => t.currentFlag);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        subtitle="Account coverage by role and fiscal year — the normalised view of the territory workbook."
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Account">
            <Select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">— select an account —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.customerCode})
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
          description="Choose an account and fiscal year to view and edit its coverage."
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
                    {territoryPlacement ? 'Move to territory…' : 'Place in territory…'}
                  </option>
                  {territories.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.territoryCode} — {t.territoryName}
                    </option>
                  ))}
                </Select>
              </div>
              {territoryPlacement &&
                territoryPlacement.assignmentStatus !== 'retired' && (
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

          {/* Role coverage matrix */}
          <Card>
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <p className="text-sm font-medium text-gray-700">
                Role coverage
                {selectedAccount ? ` — ${selectedAccount.name}` : ''}
              </p>
              <Tooltip label="この口座に担当者を割り当てます" side="bottom">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={roles.length === 0}
                  onClick={() => setAdding(true)}
                >
                  + Add assignment
                </Button>
              </Tooltip>
            </div>

            {assignmentsLoading ? (
              <div className="flex justify-center py-12">
                <Spinner label="Loading coverage…" />
              </div>
            ) : byRole.length === 0 ? (
              <EmptyState
                title="No coverage yet"
                description="Add the first role assignment for this account and fiscal year."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Territory</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {byRole.map(([code, rows]) =>
                      rows.map((a, idx) => (
                        <tr key={a.id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3 text-gray-600">
                            {idx === 0 ? (
                              <span className="font-medium text-gray-900">
                                {roleName(code)}
                              </span>
                            ) : (
                              <span className="text-gray-300">↳</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {a.isPrimary && (
                                <span title="Primary owner" className="text-amber-500">
                                  ★
                                </span>
                              )}
                              <span className="text-gray-900">
                                {empName(a.employeeId)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {terrCode(a.territoryId)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              tone={
                                tonedMeta(
                                  ASSIGNMENT_STATUS_META,
                                  a.assignmentStatus
                                ).tone
                              }
                            >
                              {
                                tonedMeta(
                                  ASSIGNMENT_STATUS_META,
                                  a.assignmentStatus
                                ).label
                              }
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {!a.isPrimary && (
                                <Tooltip label="この担当者を主担当にします">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    loading={busyId === a.id}
                                    onClick={() =>
                                      runAction(
                                        a.id,
                                        () =>
                                          setPrimaryEmployeeAssignment(
                                            assignments.employee,
                                            a.id
                                          ),
                                        'Primary owner updated.'
                                      )
                                    }
                                  >
                                    Set primary
                                  </Button>
                                </Tooltip>
                              )}
                              {a.assignmentStatus !== 'active' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  loading={busyId === a.id}
                                  onClick={() =>
                                    runAction(
                                      a.id,
                                      () =>
                                        setEmployeeAssignmentStatus(a, 'active'),
                                      'Assignment activated.'
                                    )
                                  }
                                >
                                  Activate
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50"
                                loading={busyId === a.id}
                                onClick={() =>
                                  runAction(
                                    a.id,
                                    () => deleteEmployeeAssignment(a),
                                    'Assignment removed.'
                                  )
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add assignment"
        size="lg"
      >
        <AddAssignmentForm
          roles={roles}
          employees={employees}
          territories={territories}
          saving={saving}
          onCancel={() => setAdding(false)}
          onSubmit={handleAdd}
        />
      </Modal>
    </div>
  );
}
