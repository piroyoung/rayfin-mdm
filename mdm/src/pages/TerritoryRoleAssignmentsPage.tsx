/** TerritoryRoleAssignment: direct edit of territory role-seat roster rows. */
import { useMemo, useState } from 'react';

import { listTerritories } from '@/services/territories';
import { listEmployees } from '@/services/employees';
import { listFiscalYears } from '@/services/fiscalYears';
import { listRoles } from '@/services/roles';
import {
  clearSeat,
  createTerritoryRoleAssignment,
  listTerritoryRoleAssignments,
  setTerritoryRoleStatus,
  type TerritoryRoleAssignmentInput,
} from '@/services/territoryRoleAssignments';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useToast } from '@/hooks/useToast';
import { workflowActions } from '@/domain/assignmentWorkflow';
import {
  ASSIGNMENT_STATUS_META,
  tonedMeta,
  type Employee,
  type FiscalYear,
  type Role,
  type Territory,
  type TerritoryRoleAssignment,
} from '@/domain/types';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Tooltip,
} from '@/components/ui';

interface PageData {
  rows: TerritoryRoleAssignment[];
  territories: Territory[];
  employees: Employee[];
  fiscalYears: FiscalYear[];
  roles: Role[];
}

const loadData = async (): Promise<PageData> => {
  const [rows, territories, employees, fiscalYears, roles] = await Promise.all([
    listTerritoryRoleAssignments(),
    listTerritories(),
    listEmployees(),
    listFiscalYears(),
    listRoles(),
  ]);
  return { rows, territories, employees, fiscalYears, roles };
};

const EMPTY: TerritoryRoleAssignmentInput = {
  territoryId: '',
  employeeId: '',
  fiscalYearId: '',
  roleTypeCode: '',
};

function snapshot(r: TerritoryRoleAssignment): TerritoryRoleAssignmentInput {
  return {
    territoryId: r.territoryId,
    employeeId: r.employeeId,
    fiscalYearId: r.fiscalYearId,
    roleTypeCode: r.roleTypeCode,
  };
}

function CreateForm({
  initial = EMPTY,
  territories,
  employees,
  fiscalYears,
  roles,
  saving,
  onCancel,
  onSubmit,
}: {
  initial?: TerritoryRoleAssignmentInput;
  territories: Territory[];
  employees: Employee[];
  fiscalYears: FiscalYear[];
  roles: Role[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: TerritoryRoleAssignmentInput) => void;
}) {
  const [form, setForm] = useState<TerritoryRoleAssignmentInput>(initial);
  const set = (patch: Partial<TerritoryRoleAssignmentInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const valid =
    form.territoryId && form.employeeId && form.fiscalYearId && form.roleTypeCode;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Territory" required>
          <Select
            value={form.territoryId}
            onChange={(e) => set({ territoryId: e.target.value })}
            required
          >
            <option value="">— select —</option>
            {territories.map((t) => (
              <option key={t.id} value={t.id}>
                {t.territoryCode} — {t.territoryName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Role" required>
          <Select
            value={form.roleTypeCode}
            onChange={(e) => set({ roleTypeCode: e.target.value })}
            required
          >
            <option value="">— select —</option>
            {roles
              .filter((r) => r.isActive)
              .map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} — {r.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Employee" required>
          <Select
            value={form.employeeId}
            onChange={(e) => set({ employeeId: e.target.value })}
            required
          >
            <option value="">— select —</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.alias ? `${emp.displayName} (${emp.alias})` : emp.displayName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fiscal year" required>
          <Select
            value={form.fiscalYearId}
            onChange={(e) => set({ fiscalYearId: e.target.value })}
            required
          >
            <option value="">— select —</option>
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                {fy.code}
                {fy.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        One seat per territory / role / fiscal year. Use the Territory Roster
        page to swap a seat holder with history preserved.
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={saving} disabled={!valid}>
          Create
        </Button>
      </div>
    </form>
  );
}

export function TerritoryRoleAssignmentsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(loadData);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const territories = useMemo(() => data?.territories ?? [], [data]);
  const employees = useMemo(() => data?.employees ?? [], [data]);
  const fiscalYears = useMemo(() => data?.fiscalYears ?? [], [data]);
  const roles = useMemo(() => data?.roles ?? [], [data]);

  const [creating, setCreating] = useState(false);
  const [seed, setSeed] = useState<TerritoryRoleAssignmentInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<TerritoryRoleAssignment | null>(null);

  const terrCode = useMemo(() => {
    const map = new Map(territories.map((t) => [t.id, t.territoryCode]));
    return (id: string) => map.get(id) ?? '—';
  }, [territories]);
  const empName = useMemo(() => {
    const map = new Map(employees.map((e) => [e.id, e]));
    return (id: string) => {
      const e = map.get(id);
      if (!e) return id;
      return e.alias ? `${e.displayName} (${e.alias})` : e.displayName;
    };
  }, [employees]);
  const fyCode = useMemo(() => {
    const map = new Map(fiscalYears.map((fy) => [fy.id, fy.code]));
    return (id: string) => map.get(id) ?? '—';
  }, [fiscalYears]);
  const roleName = useMemo(() => {
    const map = new Map(roles.map((r) => [r.code, r.name]));
    return (code: string) => map.get(code) ?? code;
  }, [roles]);

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
      ),
    [rows]
  );

  async function handleCreate(input: TerritoryRoleAssignmentInput) {
    setSaving(true);
    try {
      await createTerritoryRoleAssignment(input);
      toast('Seat created.', 'success');
      setCreating(false);
      setSeed(null);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Create failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

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

  async function confirmDelete() {
    if (!toDelete) return;
    const target = toDelete;
    setBusyId(target.id);
    try {
      await clearSeat(target);
      toast('Seat vacated.', 'success');
      setToDelete(null);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="TerritoryRoleAssignment"
        subtitle="Who staffs each role seat in a territory, per fiscal year. One seat per territory / role / FY."
        actions={
          <Tooltip label="新しいロールシートを作成します" side="bottom">
            <Button variant="primary" onClick={() => {
              setSeed(null);
              setCreating(true);
            }}>
              + New seat
            </Button>
          </Tooltip>
        }
      />

      <Card>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" label="Loading seats…" />
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load seats" description={error} />
        ) : sorted.length === 0 ? (
          <EmptyState
            title="No seats yet"
            description="Staff a role seat in a territory to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th className="px-4 py-3">Territory</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Fiscal year</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((row) => {
                  const meta = tonedMeta(
                    ASSIGNMENT_STATUS_META,
                    row.assignmentStatus
                  );
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <Badge tone="blue">{terrCode(row.territoryId)}</Badge>
                        {!row.currentFlag && (
                          <span className="ml-2 text-xs text-gray-400">
                            (history)
                          </span>
                        )}
                      </td>
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
                      <td className="px-4 py-3 text-gray-600">
                        {fyCode(row.fiscalYearId)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {workflowActions(row.assignmentStatus).map((a) => (
                            <Button
                              key={a.to}
                              size="sm"
                              variant={a.variant}
                              loading={busyId === row.id}
                              onClick={() =>
                                runAction(
                                  row.id,
                                  () => setTerritoryRoleStatus(row, a.to),
                                  `Seat → ${a.to}.`
                                )
                              }
                            >
                              {a.label}
                            </Button>
                          ))}
                          <Tooltip label="この行をコピーして新規作成します（年度を変えて再利用）">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSeed(snapshot(row));
                                setCreating(true);
                              }}
                            >
                              Copy
                            </Button>
                          </Tooltip>
                          <Tooltip label="このシートを空席にします">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setToDelete(row)}
                            >
                              Vacate
                            </Button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={creating}
        onClose={() => {
          setCreating(false);
          setSeed(null);
        }}
        title={seed ? 'Copy role seat' : 'New role seat'}
        size="lg"
      >
        <CreateForm
          initial={seed ?? EMPTY}
          territories={territories}
          employees={employees}
          fiscalYears={fiscalYears}
          roles={roles}
          saving={saving}
          onCancel={() => {
            setCreating(false);
            setSeed(null);
          }}
          onSubmit={handleCreate}
        />
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Vacate seat"
        message="This removes the seat row entirely. To change the holder while keeping history, use the Territory Roster page instead."
        confirmLabel="Vacate"
        danger
        loading={busyId === toDelete?.id}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
