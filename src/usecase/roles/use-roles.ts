/**
 * Roles screen view-model. Loads the catalogue through the injected
 * {@link RoleRepository}, owns search / filter / CRUD-modal state, and
 * orchestrates create / update / toggle with audit logging, toasts, and reload.
 * The page and table stay presentational.
 */
import { useMemo, useState } from 'react';

import type { RoleInput } from '@/domain/repositories/role-repository';
import type { Role } from '@/domain/types';
import { useDependencies } from '@/di/dependencies-context';
import type { ActiveFilterValue } from '@/lib/listing';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useCrudForm } from '@/usecase/shared/use-crud-form';
import { useToast } from '@/usecase/shared/toast-context';

import { filterRoles, roleSnapshot } from './selectors';

export function useRoles() {
  const { roles: repo, audit } = useDependencies();
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(() => repo.list(), []);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');
  const form = useCrudForm<Role, RoleInput>();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const roles = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(
    () => filterRoles(roles, search, activeFilter),
    [roles, search, activeFilter]
  );

  async function save(input: RoleInput) {
    setSaving(true);
    try {
      if (form.editing) {
        await repo.update(form.editing.id, input);
        await audit.log({
          domain: 'role',
          action: 'update',
          recordId: form.editing.id,
          recordLabel: input.name,
          summary: `Updated role ${input.name}`,
        });
        toast('Role updated.', 'success');
      } else {
        const created = await repo.create(input);
        await audit.log({
          domain: 'role',
          action: 'create',
          recordId: created.id,
          recordLabel: created.name,
          summary: `Created role ${created.name} (${created.code})`,
        });
        toast('Role created.', 'success');
      }
      form.close();
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: Role) {
    setBusyId(r.id);
    try {
      await repo.update(r.id, { ...roleSnapshot(r), isActive: !r.isActive });
      await audit.log({
        domain: 'role',
        action: 'update',
        recordId: r.id,
        recordLabel: r.name,
        summary: `Updated role ${r.name}`,
      });
      toast(`Role ${r.isActive ? 'deactivated' : 'activated'}.`, 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return {
    roles,
    filtered,
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
  };
}
