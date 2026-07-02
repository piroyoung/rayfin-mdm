/**
 * Data Quality screen view-model: run the assignment checks and triage the
 * issue queue. Loads issues through the injected repository, owns the
 * status / severity filters, derives the open-issue and severity counts, and
 * orchestrates run-checks plus the start / resolve / dismiss lifecycle through
 * the issue operations. The page renders only.
 */
import { useMemo, useState } from 'react';

import type {
  DataQualityIssue,
  IssueSeverity,
  ResolutionStatus,
} from '@/domain/types';
import { useDependencies } from '@/di/dependencies-context';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useToast } from '@/usecase/shared/toast-context';
import {
  dismissIssue,
  resolveIssue,
  startIssue,
  type QualityIssueDeps,
} from '@/usecase/dataquality/quality-issue-operations';
import {
  runAssignmentQualityChecks,
  type QualityCheckDeps,
} from '@/usecase/dataquality/run-assignment-quality-checks';

export interface Resolving {
  issue: DataQualityIssue;
  mode: 'resolve' | 'dismiss';
}

export type SeverityCounts = Record<IssueSeverity, number>;

export function useDataQuality() {
  const {
    dataQualityIssues,
    accounts,
    employees,
    territories,
    territoryAccountAssignments,
    territoryRoleAssignments,
    audit,
  } = useDependencies();
  const toast = useToast();

  const issueDeps: QualityIssueDeps = { dataQualityIssues, audit };
  const checkDeps: QualityCheckDeps = {
    dataQualityIssues,
    accounts,
    employees,
    territories,
    territoryAccountAssignments,
    territoryRoleAssignments,
    audit,
  };

  const { data, loading, error, reload } = useAsyncData(() =>
    dataQualityIssues.list()
  );

  const [statusFilter, setStatusFilter] = useState<ResolutionStatus | 'all'>(
    'open'
  );
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all'>(
    'all'
  );
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolving, setResolving] = useState<Resolving | null>(null);
  const [comment, setComment] = useState('');

  const issues = useMemo(() => data ?? [], [data]);

  const openIssues = useMemo(
    () =>
      issues.filter(
        (i) =>
          i.resolutionStatus === 'open' || i.resolutionStatus === 'in_progress'
      ),
    [issues]
  );

  const severityCounts = useMemo(() => {
    const counts: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const i of openIssues) counts[i.severity] += 1;
    return counts;
  }, [openIssues]);

  const filtered = useMemo(
    () =>
      issues.filter((i) => {
        if (statusFilter !== 'all' && i.resolutionStatus !== statusFilter)
          return false;
        if (severityFilter !== 'all' && i.severity !== severityFilter)
          return false;
        return true;
      }),
    [issues, statusFilter, severityFilter]
  );

  async function runChecks() {
    setRunning(true);
    try {
      const count = await runAssignmentQualityChecks(checkDeps);
      toast(
        count === 0
          ? 'Checks complete — no new issues.'
          : `Checks complete — ${count} new issue${count > 1 ? 's' : ''} raised.`,
        count === 0 ? 'success' : 'info'
      );
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Check run failed.', 'error');
    } finally {
      setRunning(false);
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

  function start(issue: DataQualityIssue) {
    return runAction(
      issue.id,
      () => startIssue(issueDeps, issue),
      'Issue moved to in-progress.'
    );
  }

  function askResolve(issue: DataQualityIssue) {
    setComment('');
    setResolving({ issue, mode: 'resolve' });
  }

  function askDismiss(issue: DataQualityIssue) {
    setComment('');
    setResolving({ issue, mode: 'dismiss' });
  }

  async function confirmResolution() {
    if (!resolving) return;
    const { issue, mode } = resolving;
    const note = comment.trim() || undefined;
    setResolving(null);
    setComment('');
    await runAction(
      issue.id,
      () =>
        mode === 'resolve'
          ? resolveIssue(issueDeps, issue, note)
          : dismissIssue(issueDeps, issue, note),
      mode === 'resolve' ? 'Issue resolved.' : 'Issue dismissed.'
    );
  }

  return {
    loading,
    error,
    issues,
    filtered,
    openIssues,
    severityCounts,
    statusFilter,
    setStatusFilter,
    severityFilter,
    setSeverityFilter,
    running,
    busyId,
    resolving,
    setResolving,
    comment,
    setComment,
    runChecks,
    start,
    askResolve,
    askDismiss,
    confirmResolution,
  };
}
