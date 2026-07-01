/** Presentational audit-event table. */
import type { AuditEvent } from '@/domain/types';

import { AuditRow } from './AuditRow';

export function AuditTable({ events }: { events: AuditEvent[] }) {
  return (
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
          {events.map((event) => (
            <AuditRow key={event.id} event={event} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
