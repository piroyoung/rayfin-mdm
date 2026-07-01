/**
 * Reference Data screen view-model. Loads governed code lists through the
 * injected {@link ReferenceRepository}, owns the create/edit modal and
 * delete-confirm state, and orchestrates create / update / delete with audit
 * logging, toasts, and reload. Grouping is derived through a selector.
 */
import { useMemo, useState } from 'react';

import type { ReferenceInput } from '@/domain/repositories/reference-repository';
import type { ReferenceValue } from '@/domain/types';
import { useDependencies } from '@/di/dependencies-context';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useCrudForm } from '@/usecase/shared/use-crud-form';
import { useToast } from '@/usecase/shared/toast-context';

import { groupReference } from './selectors';

export function useReference() {
  const { reference: repo, audit } = useDependencies();
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(() => repo.list(), []);

  const form = useCrudForm<ReferenceValue, ReferenceInput>();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ReferenceValue | null>(null);

  const groups = useMemo(() => groupReference(data ?? []), [data]);
  const knownSets = useMemo(() => groups.map((g) => g.setName), [groups]);

  async function save(input: ReferenceInput) {
    setSaving(true);
    try {
      const label = `${input.setName} / ${input.code}`;
      if (form.editing) {
        await repo.update(form.editing.id, input);
        await audit.log({
          domain: 'reference',
          action: 'update',
          recordId: form.editing.id,
          recordLabel: label,
          summary: `Updated reference ${input.setName}: ${input.label}`,
        });
        toast('Reference value updated.', 'success');
      } else {
        const created = await repo.create(input);
        await audit.log({
          domain: 'reference',
          action: 'create',
          recordId: created.id,
          recordLabel: label,
          summary: `Added reference ${input.setName}: ${input.label}`,
        });
        toast('Reference value added.', 'success');
      }
      form.close();
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(record: ReferenceValue) {
    setBusyId(record.id);
    try {
      await repo.delete(record.id);
      await audit.log({
        domain: 'reference',
        action: 'delete',
        recordId: record.id,
        recordLabel: `${record.setName} / ${record.code}`,
        summary: `Deleted reference ${record.setName}: ${record.label}`,
      });
      toast('Reference value deleted.', 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed.', 'error');
    } finally {
      setBusyId(null);
      setToDelete(null);
    }
  }

  return {
    loading,
    error,
    groups,
    knownSets,
    form,
    saving,
    busyId,
    toDelete,
    setToDelete,
    save,
    remove,
  };
}
