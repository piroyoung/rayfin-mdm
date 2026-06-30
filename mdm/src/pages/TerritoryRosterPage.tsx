/**
 * Territory Roster: pick a territory + fiscal year, then staff each role seat
 * with exactly one member. This is the canonical place role → person is decided;
 * accounts inherit their team from the roster of the territory they sit in (see
 * the derived team on the Assignments page).
 */
import { useEffect, useMemo, useState } from 'react';

import { listFiscalYears } from '@/services/fiscalYears';
import { listAccountAssignableRoles } from '@/services/roles';
import { listEmployees } from '@/services/employees';
import { listTerritories } from '@/services/territories';
import {
  clearSeat,
  listTerritoryRoleAssignmentsForTerritory,
  setSeatMember,
  setTerritoryRoleStatus,
} from '@/services/territoryRoleAssignments';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useToast } from '@/hooks/useToast';
import { territoryRoleScopeKey } from '@/domain/territoryRoster';
import { canTransition, workflowActions } from '@/domain/assignmentWorkflow';
import {
  ASSIGNMENT_STATUS_META,
  tonedMeta,
  type AssignmentStatus,
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
  EmptyState,
  Field,
  PageHeader,
  Select,
  Spinner,
  Tooltip,
} from '@/components/ui';

interface RefData {
  territories: Territory[];
  fiscalYears: FiscalYear[];
  roles: Role[];
  employees: Employee[];
}

const loadRefs = async (): Promise<RefData> => {
  const [territories, fiscalYears, roles, employees] = await Promise.all([
    listTerritories(),
    listFiscalYears(),
    listAccountAssignableRoles(),
    listEmployees(),
  ]);
  return { territories, fiscalYears, roles, employees };
};

export function TerritoryRosterPage() {
  const toast = useToast();
  const { data: refs, loading: refsLoading } = useAsyncData(loadRefs);

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
      const rows = await listTerritoryRoleAssignmentsForTerritory(
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
  const seatFor = (roleTypeCode: string): TerritoryRoleAssignment | undefined => {
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
          await clearSeat(seat);
          toast('Seat vacated.', 'success');
        }
      } else {
        await setSeatMember(
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
      await setTerritoryRoleStatus(seat, status);
      await reloadSeats();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed.', 'error');
    } finally {
      setBusyRole(null);
    }
  }

  const territory = territories.find((t) => t.id === territoryId);
  const filledSeats = roles.filter((r) => seatFor(r.code)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Territory Roster"
        subtitle="Staff one member per role in each territory. Accounts inherit their team from the territory they sit in."
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Territory">
            <Select
              value={territoryId}
              onChange={(e) => setTerritoryId(e.target.value)}
            >
              {territories.length === 0 && <option value="">— None —</option>}
              {territories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.territoryCode} — {t.territoryName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fiscal year">
            <Select
              value={fiscalYearId}
              onChange={(e) => setFiscalYearId(e.target.value)}
            >
              {fiscalYears.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code}
                  {f.isCurrent ? ' (current)' : ''}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {territory
                ? `${territory.territoryCode} role seats`
                : 'Role seats'}
            </p>
            <p className="text-xs text-gray-500">
              {filledSeats} of {roles.length} roles staffed
            </p>
          </div>
        </div>

        {refsLoading || loadingSeats ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : !territoryId || roles.length === 0 ? (
          <EmptyState
            title="Nothing to staff"
            description="Pick a territory and fiscal year, and make sure account-assignable roles exist."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roles.map((role) => {
                  const seat = seatFor(role.code);
                  const busy = busyRole === role.code;
                  const meta = seat
                    ? tonedMeta(ASSIGNMENT_STATUS_META, seat.assignmentStatus)
                    : null;
                  return (
                    <tr key={role.code} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{role.code}</p>
                        <p className="text-xs text-gray-500">{role.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={seat?.employeeId ?? ''}
                          disabled={busy}
                          onChange={(e) => assign(role.code, e.target.value)}
                        >
                          <option value="">— Vacant —</option>
                          {seat &&
                            !employeeById.get(seat.employeeId)?.isActive &&
                            employeeById.get(seat.employeeId) && (
                              <option value={seat.employeeId}>
                                {employeeById.get(seat.employeeId)!.displayName}{' '}
                                (inactive)
                              </option>
                            )}
                          {activeEmployees.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.displayName}
                              {e.alias ? ` (${e.alias})` : ''}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        {seat && meta ? (
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {seat &&
                            workflowActions(seat.assignmentStatus).map((a) => (
                              <Tooltip key={a.to} label={`Move to ${a.label}`}>
                                <Button
                                  size="sm"
                                  variant={a.variant}
                                  loading={busy}
                                  disabled={
                                    !canTransition(seat.assignmentStatus, a.to)
                                  }
                                  onClick={() => advance(seat, a.to)}
                                >
                                  {a.label}
                                </Button>
                              </Tooltip>
                            ))}
                          {seat && (
                            <Tooltip label="Vacate this seat">
                              <Button
                                size="sm"
                                variant="ghost"
                                loading={busy}
                                onClick={() => assign(role.code, '')}
                              >
                                Clear
                              </Button>
                            </Tooltip>
                          )}
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
    </div>
  );
}
