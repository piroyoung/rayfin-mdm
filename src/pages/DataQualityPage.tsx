/** Data quality: run assignment checks, triage the issue queue, resolve/dismiss. */
import { useMemo, useState } from 'react';

import {
  dismissDataQualityIssue,
  listDataQualityIssues,
  resolveDataQualityIssue,
  runAssignmentQualityChecks,
  startDataQualityIssue,
} from '@/services/dataQuality';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useToast } from '@/usecase/shared/toast-context';
import { fmtRelative } from '@/lib/format';
import {
  ISSUE_TYPE_META,
  RESOLUTION_STATUS_META,
  SEVERITY_META,
  labelledMeta,
  tonedMeta,
  type DataQualityIssue,
  type IssueSeverity,
  type ResolutionStatus,
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
  StatCard,
  Textarea,
  Tooltip,
} from '@/components/shared';

const SEVERITIES: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];

export function DataQualityPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(listDataQualityIssues);

  const [statusFilter, setStatusFilter] = useState<ResolutionStatus | 'all'>(
    'open'
  );
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all'>(
    'all'
  );
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolving, setResolving] = useState<{
    issue: DataQualityIssue;
    mode: 'resolve' | 'dismiss';
  } | null>(null);
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
    const counts: Record<IssueSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const i of openIssues) counts[i.severity] += 1;
    return counts;
  }, [openIssues]);

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (statusFilter !== 'all' && i.resolutionStatus !== statusFilter)
        return false;
      if (severityFilter !== 'all' && i.severity !== severityFilter)
        return false;
      return true;
    });
  }, [issues, statusFilter, severityFilter]);

  async function runChecks() {
    setRunning(true);
    try {
      const count = await runAssignmentQualityChecks();
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
          ? resolveDataQualityIssue(issue, note)
          : dismissDataQualityIssue(issue, note),
      mode === 'resolve' ? 'Issue resolved.' : 'Issue dismissed.'
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Quality"
        subtitle="Automated assignment checks and the steward triage queue."
        actions={
          <Tooltip label="割り当てデータの品質チェックを実行します" side="bottom">
            <Button variant="primary" loading={running} onClick={runChecks}>
              Run checks
            </Button>
          </Tooltip>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Open issues"
          value={openIssues.length}
          tone={openIssues.length > 0 ? 'amber' : 'green'}
          hint="Open + in-progress"
        />
        <StatCard
          label="Critical"
          value={severityCounts.critical}
          tone={severityCounts.critical > 0 ? 'red' : 'gray'}
        />
        <StatCard
          label="High"
          value={severityCounts.high}
          tone={severityCounts.high > 0 ? 'red' : 'gray'}
        />
        <StatCard
          label="Medium"
          value={severityCounts.medium}
          tone={severityCounts.medium > 0 ? 'amber' : 'gray'}
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <Select
            className="w-44"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ResolutionStatus | 'all')
            }
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </Select>
          <Select
            className="w-40"
            value={severityFilter}
            onChange={(e) =>
              setSeverityFilter(e.target.value as IssueSeverity | 'all')
            }
          >
            <option value="all">All severities</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_META[s].label}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" label="Loading issues…" />
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load issues" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No issues"
            description={
              issues.length === 0
                ? 'Run the checks to populate the triage queue.'
                : 'Nothing matches the current filters.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th className="px-4 py-3">Issue</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Detected</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {labelledMeta(ISSUE_TYPE_META, i.issueType).label}
                      </p>
                      {i.description && (
                        <p className="mt-0.5 max-w-md text-xs text-gray-500">
                          {i.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={tonedMeta(SEVERITY_META, i.severity).tone}>
                        {tonedMeta(SEVERITY_META, i.severity).label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {i.entityType}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {fmtRelative(i.detectedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          tonedMeta(RESOLUTION_STATUS_META, i.resolutionStatus)
                            .tone
                        }
                      >
                        {
                          tonedMeta(RESOLUTION_STATUS_META, i.resolutionStatus)
                            .label
                        }
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {i.resolutionStatus === 'open' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={busyId === i.id}
                            onClick={() =>
                              runAction(
                                i.id,
                                () => startDataQualityIssue(i),
                                'Issue moved to in-progress.'
                              )
                            }
                          >
                            Start
                          </Button>
                        )}
                        {(i.resolutionStatus === 'open' ||
                          i.resolutionStatus === 'in_progress') && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setComment('');
                                setResolving({ issue: i, mode: 'resolve' });
                              }}
                            >
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setComment('');
                                setResolving({ issue: i, mode: 'dismiss' });
                              }}
                            >
                              Dismiss
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={resolving !== null}
        onClose={() => setResolving(null)}
        title={
          resolving?.mode === 'dismiss' ? 'Dismiss issue' : 'Resolve issue'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setResolving(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={busyId === resolving?.issue.id}
              onClick={confirmResolution}
            >
              {resolving?.mode === 'dismiss' ? 'Dismiss' : 'Resolve'}
            </Button>
          </>
        }
      >
        <Field label="Comment (optional)">
          <Textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What was done, or why this is being dismissed…"
          />
        </Field>
      </Modal>
    </div>
  );
}
