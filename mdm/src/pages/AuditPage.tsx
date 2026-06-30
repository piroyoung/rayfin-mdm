/** Audit Log: immutable, filterable trail of every master-data change. */
import { useMemo, useState } from 'react';

import { listAudit } from '@/services/audit';
import {
  AUDIT_ACTION_META,
  humanizeToken,
  tonedMeta,
  type AuditAction,
  type AuditDomain,
  type AuditEvent,
} from '@/domain/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { fmtDateTime } from '@/lib/format';
import {
  Badge,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Spinner,
} from '@/components/ui';

const DOMAIN_LABELS: Record<AuditDomain, string> = {
  account: 'Account',
  reference: 'Reference',
  change_request: 'Change request',
  employee: 'Employee',
  territory: 'Territory',
  territory_role: 'Territory role seat',
  fiscal_year: 'Fiscal year',
  role: 'Role',
  assignment: 'Assignment',
  source_xref: 'Source xref',
  data_quality: 'Data quality',
};

export function AuditPage() {
  const { data, loading, error } = useAsyncData(listAudit);

  const [domainFilter, setDomainFilter] = useState<AuditDomain | 'all'>('all');
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [search, setSearch] = useState('');

  const events = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (domainFilter !== 'all' && e.domain !== domainFilter) return false;
      if (actionFilter !== 'all' && e.action !== actionFilter) return false;
      if (!q) return true;
      return [e.summary, e.recordLabel, e.actor]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [events, domainFilter, actionFilter, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Immutable record of every create, update, approval and merge."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <div className="min-w-0 flex-1">
            <Input
              placeholder="Search summary, record, actor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            className="w-40"
            value={domainFilter}
            onChange={(e) =>
              setDomainFilter(e.target.value as AuditDomain | 'all')
            }
          >
            <option value="all">All domains</option>
            {(Object.keys(DOMAIN_LABELS) as AuditDomain[]).map((d) => (
              <option key={d} value={d}>
                {DOMAIN_LABELS[d]}
              </option>
            ))}
          </Select>
          <Select
            className="w-40"
            value={actionFilter}
            onChange={(e) =>
              setActionFilter(e.target.value as AuditAction | 'all')
            }
          >
            <option value="all">All actions</option>
            {(Object.keys(AUDIT_ACTION_META) as AuditAction[]).map((a) => (
              <option key={a} value={a}>
                {AUDIT_ACTION_META[a].label}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" label="Loading audit log…" />
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load audit log" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No audit events"
            description={
              events.length === 0
                ? 'Activity will appear here as you manage master data.'
                : 'No events match your filters.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Record</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((event) => (
                  <AuditRow key={event.id} event={event} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function AuditRow({ event }: { event: AuditEvent }) {
  return (
    <tr className="align-top hover:bg-gray-50/60">
      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
        {fmtDateTime(event.createdAt)}
      </td>
      <td className="px-4 py-3">
        <Badge tone={tonedMeta(AUDIT_ACTION_META, event.action).tone}>
          {tonedMeta(AUDIT_ACTION_META, event.action).label}
        </Badge>
      </td>
      <td className="px-4 py-3 text-gray-600">
        {DOMAIN_LABELS[event.domain] ?? humanizeToken(event.domain)}
      </td>
      <td className="px-4 py-3 text-gray-700">{event.recordLabel ?? '—'}</td>
      <td className="px-4 py-3 text-gray-700">
        {event.summary ?? '—'}
        {event.details && (
          <details className="mt-1">
            <summary className="cursor-pointer text-xs text-indigo-600 hover:text-indigo-500">
              details
            </summary>
            <pre className="mt-1 max-w-md overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-600">
              {event.details}
            </pre>
          </details>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{event.actor ?? '—'}</td>
    </tr>
  );
}
