/** Presentational single audit-event row. */
import { Badge } from '@/components/shared';
import { AUDIT_DOMAIN_LABELS } from '@/usecase/audit/selectors';
import {
  AUDIT_ACTION_META,
  humanizeToken,
  tonedMeta,
  type AuditEvent,
} from '@/domain/types';
import { fmtDateTime } from '@/lib/format';

export function AuditRow({ event }: { event: AuditEvent }) {
  const action = tonedMeta(AUDIT_ACTION_META, event.action);
  return (
    <tr className="align-top hover:bg-gray-50/60">
      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
        {fmtDateTime(event.createdAt)}
      </td>
      <td className="px-4 py-3">
        <Badge tone={action.tone}>{action.label}</Badge>
      </td>
      <td className="px-4 py-3 text-gray-600">
        {AUDIT_DOMAIN_LABELS[event.domain] ?? humanizeToken(event.domain)}
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
