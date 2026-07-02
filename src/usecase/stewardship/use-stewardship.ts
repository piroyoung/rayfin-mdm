/**
 * Stewardship screen view-model: the change-request approval queue. Loads
 * requests through the injected repository, owns the status filter and the
 * decision-modal state, and orchestrates approve / reject through the decision
 * operations. The page renders only.
 */
import { useMemo, useState } from 'react';

import type { ChangeRequest, ChangeStatus } from '@/domain/types';
import { useDependencies } from '@/di/dependencies-context';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useToast } from '@/usecase/shared/toast-context';
import {
  approveChangeRequest,
  rejectChangeRequest,
  type DecideChangeRequestDeps,
} from '@/usecase/stewardship/decide-change-request';

export interface Decision {
  request: ChangeRequest;
  kind: 'approve' | 'reject';
}

export function useStewardship() {
  const { changeRequests, accounts, audit } = useDependencies();
  const toast = useToast();
  const decideDeps: DecideChangeRequestDeps = { changeRequests, accounts, audit };

  const { data, loading, error, reload } = useAsyncData(() =>
    changeRequests.list()
  );

  const [statusFilter, setStatusFilter] = useState<ChangeStatus | 'all'>('open');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState('');

  const requests = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  const openCount = useMemo(
    () => requests.filter((r) => r.status === 'open').length,
    [requests]
  );

  function askApprove(request: ChangeRequest) {
    setNote('');
    setDecision({ request, kind: 'approve' });
  }

  function askReject(request: ChangeRequest) {
    setNote('');
    setDecision({ request, kind: 'reject' });
  }

  async function confirmDecision() {
    if (!decision) return;
    const { request, kind } = decision;
    setBusyId(request.id);
    try {
      if (kind === 'approve') {
        await approveChangeRequest(decideDeps, request, note.trim() || undefined);
        toast('Change request approved.', 'success');
      } else {
        await rejectChangeRequest(decideDeps, request, note.trim() || undefined);
        toast('Change request rejected.', 'success');
      }
      setDecision(null);
      setNote('');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return {
    loading,
    error,
    filtered,
    openCount,
    statusFilter,
    setStatusFilter,
    busyId,
    decision,
    setDecision,
    note,
    setNote,
    askApprove,
    askReject,
    confirmDecision,
  };
}
