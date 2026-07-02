/**
 * Recent-activity Card: the seven newest audit events with action badge, domain
 * label and relative time, plus a link to the full audit log. Purely
 * presentational.
 */
import { Link } from 'react-router-dom';

import { Badge, Card } from '@/components/shared';
import {
  AUDIT_ACTION_META,
  MASTER_DOMAIN_META,
  tonedMeta,
  type AuditEvent,
} from '@/domain/types';
import { fmtRelative } from '@/lib/format';

interface RecentActivityCardProps {
  events: AuditEvent[];
}

export function RecentActivityCard({ events }: RecentActivityCardProps) {
  return (
    <Card className="p-5 lg:col-span-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
        <Link
          to="/audit"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
        >
          View audit log →
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="mt-6 text-center text-sm text-gray-500">
          No activity recorded yet.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {events.slice(0, 7).map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-3 py-2.5 text-sm"
            >
              <Badge tone={tonedMeta(AUDIT_ACTION_META, event.action).tone}>
                {tonedMeta(AUDIT_ACTION_META, event.action).label}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-gray-700">
                {event.summary ?? event.recordLabel ?? '—'}
              </span>
              <span className="hidden shrink-0 text-xs text-gray-400 sm:block">
                {MASTER_DOMAIN_META[
                  event.domain as keyof typeof MASTER_DOMAIN_META
                ]?.label ?? event.domain}
              </span>
              <span className="shrink-0 text-xs text-gray-400">
                {fmtRelative(event.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
