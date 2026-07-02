/**
 * Employees screen view-model. Loads the employee master and the role
 * catalogue through injected repositories, derives identity conflicts, owns
 * search / filter / CRUD-modal state, and orchestrates create / update / toggle
 * with audit logging, toasts, and reload. The page and table stay presentational.
 */
import { useMemo, useState } from 'react';

import { employeeLabel, employeeSnapshot } from '@/domain/models/employee';
import { findEmployeeIdentityConflicts } from '@/domain/policies/employee-conflicts';
import type { EmployeeInput } from '@/domain/repositories/employee-repository';
import type { Employee } from '@/domain/types';
import { useDependencies } from '@/di/dependencies-context';
import type { ActiveFilterValue } from '@/lib/listing';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useCrudForm } from '@/usecase/shared/use-crud-form';
import { useToast } from '@/usecase/shared/toast-context';

import { createEmployee, updateEmployee } from './employee-operations';
import { conflictedIdSet, filterEmployees } from './selectors';

export function useEmployees() {
  const { employees: repo, roles: roleRepo, audit } = useDependencies();
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(() => repo.list(), []);
  const { data: roleData } = useAsyncData(() => roleRepo.list(), []);
  const roles = useMemo(() => roleData ?? [], [roleData]);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');
  const form = useCrudForm<Employee, EmployeeInput>();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const employees = useMemo(() => data ?? [], [data]);

  const conflicts = useMemo(
    () => findEmployeeIdentityConflicts(employees),
    [employees]
  );
  const conflictedIds = useMemo(() => conflictedIdSet(conflicts), [conflicts]);

  const filtered = useMemo(
    () => filterEmployees(employees, search, activeFilter),
    [employees, search, activeFilter]
  );

  async function save(input: EmployeeInput) {
    setSaving(true);
    try {
      if (form.editing) {
        await updateEmployee({ employees: repo, audit }, form.editing.id, input);
        toast('Employee updated.', 'success');
      } else {
        await createEmployee({ employees: repo, audit }, input);
        toast('Employee created.', 'success');
      }
      form.close();
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(e: Employee) {
    setBusyId(e.id);
    try {
      await repo.setActive(e.id, !e.isActive);
      await audit.log({
        domain: 'employee',
        action: 'status_change',
        recordId: e.id,
        recordLabel: employeeLabel(e),
        summary: `Employee ${e.displayName} → ${!e.isActive ? 'active' : 'inactive'}`,
      });
      toast(`Employee ${e.isActive ? 'deactivated' : 'activated'}.`, 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return {
    employees,
    roles,
    filtered,
    conflicts,
    conflictedIds,
    loading,
    error,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    form,
    saving,
    busyId,
    save,
    toggleActive,
    snapshot: employeeSnapshot,
  };
}
