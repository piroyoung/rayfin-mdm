/**
 * Seat-approval queue view-model: surfaces SUBMITTED territory-role seats
 * awaiting a steward decision and drives the same state machine as the
 * Assignments screen (submitted → approved, or sent back to draft). Loads seats
 * and reference data through injected repositories, derives the submitted subset
 * and the id→label lookups, and orchestrates the decision through the shared
 * role-seat operations.
 */
import { useMemo, useState } from 'react';

import { lookupFn } from '@/lib/listing';
import type {
  AssignmentStatus,
  TerritoryRoleAssignment,
} from '@/domain/types';
import { useDependencies } from '@/di/dependencies-context';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useToast } from '@/usecase/shared/toast-context';
import {
  advanceSeatStatus,
  type RoleSeatDeps,
} from '@/usecase/assignments/role-seat-operations';

export function useSeatApprovals() {
  const {
    territoryRoleAssignments,
    territories: territoryRepo,
    employees: employeeRepo,
    roles: roleRepo,
    audit,
  } = useDependencies();
  const toast = useToast();
  const seatDeps: RoleSeatDeps = { territoryRoleAssignments, audit };

  const { data, loading, reload } = useAsyncData(async () => {
    const [seats, territories, employees, roles] = await Promise.all([
      territoryRoleAssignments.list(),
      territoryRepo.list(),
      employeeRepo.list(),
      roleRepo.list(),
    ]);
    return { seats, territories, employees, roles };
  });

  const submitted = useMemo(
    () =>
      (data?.seats ?? []).filter((a) => a.assignmentStatus === 'submitted'),
    [data]
  );

  const territoryName = useMemo(
    () =>
      lookupFn(
        data?.territories ?? [],
        (t) => t.id,
        (t) => `${t.territoryName} (${t.territoryCode})`
      ),
    [data]
  );
  const employeeName = useMemo(
    () =>
      lookupFn(
        data?.employees ?? [],
        (e) => e.id,
        (e) => (e.alias ? `${e.displayName} (${e.alias})` : e.displayName)
      ),
    [data]
  );
  const roleName = useMemo(
    () =>
      lookupFn(
        data?.roles ?? [],
        (r) => r.code,
        (r) => r.name
      ),
    [data]
  );

  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(
    record: TerritoryRoleAssignment,
    to: Extract<AssignmentStatus, 'approved' | 'draft'>,
    ok: string
  ) {
    setBusyId(record.id);
    try {
      await advanceSeatStatus(seatDeps, record, to);
      toast(ok, 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return {
    loading,
    submitted,
    territoryName,
    employeeName,
    roleName,
    busyId,
    approve: (a: TerritoryRoleAssignment) =>
      decide(a, 'approved', 'Seat approved.'),
    sendBack: (a: TerritoryRoleAssignment) =>
      decide(a, 'draft', 'Sent back to draft.'),
  };
}
