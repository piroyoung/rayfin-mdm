/**
 * Accounts screen view-model. Loads the master through the injected
 * {@link AccountRepository}, derives duplicates, owns search / filter / modal /
 * confirm state, and orchestrates create / update / lifecycle / merge / delete
 * and submit-for-approval with audit logging, toasts, and reload. The page and
 * its components stay presentational.
 */
import { useMemo, useState } from 'react';

import { findAccountDuplicates } from '@/domain/duplicates';
import {
  accountLabel,
  accountName,
  accountSnapshot,
  accountStatusAction,
} from '@/domain/models/account';
import type { AccountInput } from '@/domain/repositories/account-repository';
import type { Account } from '@/domain/types';
import { useDependencies } from '@/di/dependencies-context';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useCrudForm } from '@/usecase/shared/use-crud-form';
import { useToast } from '@/usecase/shared/toast-context';
import { submitChangeRequest } from '@/usecase/stewardship/submit-change-request';

import { filterAccounts, type StatusFilterValue } from './selectors';

export function useAccounts() {
  const { accounts: repo, changeRequests, audit } = useDependencies();
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(() => repo.list(), []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const form = useCrudForm<Account, AccountInput>();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Account | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const accounts = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(
    () => filterAccounts(accounts, search, statusFilter),
    [accounts, search, statusFilter]
  );
  const duplicates = useMemo(() => findAccountDuplicates(accounts), [accounts]);

  async function save(input: AccountInput) {
    setSaving(true);
    try {
      if (form.editing) {
        await repo.update(form.editing.id, input);
        await audit.log({
          domain: 'account',
          action: 'update',
          recordId: form.editing.id,
          recordLabel: accountLabel(input),
          summary: `Updated account ${accountName(input)}`,
        });
        toast('Account updated.', 'success');
      } else {
        const created = await repo.create(input);
        await audit.log({
          domain: 'account',
          action: 'create',
          recordId: created.id,
          recordLabel: accountLabel(input),
          summary: `Created account ${accountName(input)}`,
        });
        toast('Account created.', 'success');
      }
      form.close();
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function runAction(id: string, fn: () => Promise<unknown>, ok: string) {
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

  function submitForApproval(a: Account) {
    return runAction(
      a.id,
      () =>
        submitChangeRequest(
          { changeRequests, accounts: repo, audit },
          {
            domain: 'account',
            changeType: a.status === 'draft' ? 'create' : 'update',
            recordId: a.id,
            recordLabel: accountLabel(a),
            payload: accountSnapshot(a),
          }
        ),
      'Submitted for approval.'
    );
  }

  function archive(a: Account) {
    return runAction(
      a.id,
      async () => {
        await repo.setStatus(a.id, 'archived');
        await audit.log({
          domain: 'account',
          action: accountStatusAction('archived'),
          recordId: a.id,
          recordLabel: accountLabel(a),
          summary: `Account ${accountName(a)} → archived`,
        });
      },
      'Account archived.'
    );
  }

  function merge(groupKey: string, winner: Account, losers: Account[]) {
    return runAction(
      groupKey,
      async () => {
        const survivors = losers.filter((l) => l.id !== winner.id);
        await repo.merge(
          winner.id,
          survivors.map((l) => l.id)
        );
        for (const loser of survivors) {
          await audit.log({
            domain: 'account',
            action: 'merge',
            recordId: loser.id,
            recordLabel: accountLabel(loser),
            summary: `Merged ${accountName(loser)} into ${accountName(winner)}`,
            details: { winnerId: winner.id, winnerNumber: winner.accountNumber },
          });
        }
      },
      'Records merged.'
    );
  }

  function confirmDelete() {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    void runAction(
      target.id,
      async () => {
        await repo.delete(target.id);
        await audit.log({
          domain: 'account',
          action: 'delete',
          recordId: target.id,
          recordLabel: accountLabel(target),
          summary: `Deleted account ${accountName(target)}`,
        });
      },
      'Account deleted.'
    );
  }

  return {
    accounts,
    filtered,
    duplicates,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    form,
    saving,
    busyId,
    toDelete,
    setToDelete,
    showDuplicates,
    setShowDuplicates,
    save,
    submitForApproval,
    archive,
    merge,
    confirmDelete,
    snapshot: accountSnapshot,
  };
}
