/** Stewardship: the change-request approval queue. */
import { useMemo, useState } from 'react';

import {
  approveChangeRequest,
  listChangeRequests,
  rejectChangeRequest,
} from '@/services/stewardship';
import {
  listEmployeeAssignments,
  setEmployeeAssignmentStatus,
} from '@/services/assignments';
import { listCustomers } from '@/services/customers';
import { listEmployees } from '@/services/employees';
import { listRoleTypes } from '@/services/roleTypes';
import {
  CHANGE_STATUS_META,
  CHANGE_TYPE_META,
  labelledMeta,
  MASTER_DOMAIN_META,
  tonedMeta,
  type AccountEmployeeAssignment,
  type ChangeRequest,
  type ChangeStatus,
} from '@/domain/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useToast } from '@/hooks/useToast';
import { fmtDateTime, fmtRelative } from '@/lib/format';
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
  Textarea,
  Tooltip,
} from '@/components/ui';

function prettyPayload(payload?: string): string | null {
  if (!payload) return null;
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

interface ApprovalRefs {
  submitted: AccountEmployeeAssignment[];
  accountName: (id: string) => string;
  employeeName: (id: string) => string;
  roleName: (code: string) => string;
}

/**
 * Assignment-approval queue. Surfaces SUBMITTED employee assignments awaiting a
 * steward decision and drives the same state machine used on the Assignments
 * page (submitted → approved, or sent back to draft).
 */
function AssignmentApprovals() {
  const toast = useToast();
  const { data, loading, reload } = useAsyncData<ApprovalRefs>(async () => {
    const [assignments, customers, employees, roles] = await Promise.all([
      listEmployeeAssignments(),
      listCustomers(),
      listEmployees(),
      listRoleTypes(),
    ]);
    const accounts = new Map(customers.map((c) => [c.id, c.name]));
    const emps = new Map(employees.map((e) => [e.id, e]));
    const roleMap = new Map(roles.map((r) => [r.code, r.name]));
    return {
      submitted: assignments.filter((a) => a.assignmentStatus === 'submitted'),
      accountName: (id) => accounts.get(id) ?? id,
      employeeName: (id) => {
        const e = emps.get(id);
        if (!e) return id;
        return e.alias ? `${e.displayName} (${e.alias})` : e.displayName;
      },
      roleName: (code) => roleMap.get(code) ?? code,
    };
  });

  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(
    record: AccountEmployeeAssignment,
    to: 'approved' | 'draft',
    ok: string
  ) {
    setBusyId(record.id);
    try {
      await setEmployeeAssignmentStatus(record, to);
      toast(ok, 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  if (loading || !data || data.submitted.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          Assignment approvals
        </p>
        <Badge tone="amber">{data.submitted.length} submitted</Badge>
      </div>
      <ul className="mt-3 divide-y divide-gray-50">
        {data.submitted.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm"
          >
            <span className="font-medium text-gray-900">
              {data.accountName(a.accountId)}
            </span>
            <Badge tone="blue">{data.roleName(a.roleTypeCode)}</Badge>
            <span className="text-gray-600">{data.employeeName(a.employeeId)}</span>
            {a.isPrimary && <span className="text-amber-500" title="Primary">★</span>}
            <div className="ml-auto flex items-center gap-1">
              <Button
                size="sm"
                variant="primary"
                loading={busyId === a.id}
                onClick={() =>
                  decide(a, 'approved', 'Assignment approved.')
                }
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                loading={busyId === a.id}
                onClick={() => decide(a, 'draft', 'Sent back to draft.')}
              >
                Send back
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function StewardshipPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(listChangeRequests);

  const [statusFilter, setStatusFilter] = useState<ChangeStatus | 'all'>('open');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decision, setDecision] = useState<{
    request: ChangeRequest;
    kind: 'approve' | 'reject';
  } | null>(null);
  const [note, setNote] = useState('');

  const requests = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  const openCount = requests.filter((r) => r.status === 'open').length;

  async function confirmDecision() {
    if (!decision) return;
    const { request, kind } = decision;
    setBusyId(request.id);
    try {
      if (kind === 'approve') {
        await approveChangeRequest(request, note.trim() || undefined);
        toast('Change request approved.', 'success');
      } else {
        await rejectChangeRequest(request, note.trim() || undefined);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stewardship"
        subtitle="Review and approve proposed changes before they become golden records."
        actions={
          <Select
            className="w-44"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ChangeStatus | 'all')
            }
          >
            <option value="all">All requests</option>
            <option value="open">Open ({openCount})</option>
            <option value="applied">Applied</option>
            <option value="rejected">Rejected</option>
          </Select>
        }
      />

      <AssignmentApprovals />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Loading change requests…" />
        </div>
      ) : error ? (
        <Card>
          <EmptyState title="Couldn't load change requests" description={error} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing to review"
            description={
              statusFilter === 'open'
                ? 'There are no open change requests. Submit a record for approval to see it here.'
                : 'No change requests match this filter.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((cr) => {
            const payload = prettyPayload(cr.payload);
            return (
              <Card key={cr.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="indigo">
                        {labelledMeta(MASTER_DOMAIN_META, cr.domain).label}
                      </Badge>
                      <Badge tone="slate">
                        {labelledMeta(CHANGE_TYPE_META, cr.changeType).label}
                      </Badge>
                      <Badge tone={tonedMeta(CHANGE_STATUS_META, cr.status).tone}>
                        {tonedMeta(CHANGE_STATUS_META, cr.status).label}
                      </Badge>
                    </div>
                    <p className="mt-2 font-medium text-gray-900">
                      {cr.recordLabel ?? 'New record'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Requested by {cr.requestedBy ?? 'unknown'} ·{' '}
                      {fmtRelative(cr.createdAt)}
                    </p>
                    {cr.reason && (
                      <p className="mt-2 text-sm text-gray-600">
                        “{cr.reason}”
                      </p>
                    )}
                  </div>

                  {cr.status === 'open' && (
                    <div className="flex shrink-0 gap-2">
                      <Tooltip
                        label="この変更を承認し、ゴールデンレコードに反映します"
                        side="top"
                      >
                        <Button
                          size="sm"
                          variant="primary"
                          loading={busyId === cr.id}
                          onClick={() => {
                            setNote('');
                            setDecision({ request: cr, kind: 'approve' });
                          }}
                        >
                          Approve
                        </Button>
                      </Tooltip>
                      <Tooltip
                        label="この変更を却下し、修正のため差し戻します"
                        side="top"
                      >
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busyId === cr.id}
                          onClick={() => {
                            setNote('');
                            setDecision({ request: cr, kind: 'reject' });
                          }}
                        >
                          Reject
                        </Button>
                      </Tooltip>
                    </div>
                  )}
                </div>

                {payload && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-indigo-600 hover:text-indigo-500">
                      View proposed values
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                      {payload}
                    </pre>
                  </details>
                )}

                {cr.status !== 'open' && (
                  <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
                    {cr.status === 'applied' ? 'Approved' : 'Rejected'} by{' '}
                    {cr.reviewedBy ?? 'unknown'} · {fmtDateTime(cr.decidedAt)}
                    {cr.reviewNote ? ` — ${cr.reviewNote}` : ''}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={decision !== null}
        onClose={() => setDecision(null)}
        title={
          decision?.kind === 'approve'
            ? 'Approve change request'
            : 'Reject change request'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button
              variant={decision?.kind === 'approve' ? 'primary' : 'danger'}
              loading={busyId === decision?.request.id}
              onClick={() => void confirmDecision()}
            >
              {decision?.kind === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-gray-600">
          {decision?.kind === 'approve'
            ? 'Approving will apply this change and promote the record to its golden state.'
            : 'Rejecting will send the record back for revision.'}
        </p>
        <Field label="Review note" hint="Optional — recorded in the audit trail.">
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for the requester…"
          />
        </Field>
      </Modal>
    </div>
  );
}
