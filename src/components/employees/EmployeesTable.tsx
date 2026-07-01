/** Presentational employees table. All actions are passed in as handlers. */
import type { Employee } from '@/domain/types';
import { Button, RowActions, StatusBadge, Tooltip } from '@/components/shared';
import { fmtRelative } from '@/lib/format';

export function EmployeesTable({
  employees,
  conflictedIds,
  busyId,
  onEdit,
  onDuplicate,
  onToggleActive,
}: {
  employees: Employee[];
  conflictedIds: Set<string>;
  busyId: string | null;
  onEdit: (employee: Employee) => void;
  onDuplicate: (employee: Employee) => void;
  onToggleActive: (employee: Employee) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
          <th className="px-4 py-3">Employee</th>
          <th className="px-4 py-3">Alias</th>
          <th className="px-4 py-3">Title</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Updated</th>
          <th className="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {employees.map((e) => (
          <tr key={e.id} className="hover:bg-gray-50/60">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                {conflictedIds.has(e.id) && (
                  <span title="Identity conflict" className="text-amber-500">
                    ⚠
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {e.displayName}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {e.localName ?? e.upn ?? e.email ?? '—'}
                  </p>
                </div>
              </div>
            </td>
            <td className="px-4 py-3 text-gray-600">{e.alias ?? '—'}</td>
            <td className="px-4 py-3 text-gray-600">{e.jobTitle ?? '—'}</td>
            <td className="px-4 py-3">
              <StatusBadge active={e.isActive} />
            </td>
            <td className="px-4 py-3 text-xs text-gray-500">
              {fmtRelative(e.updatedAt)}
            </td>
            <td className="px-4 py-3">
              <RowActions>
                <Tooltip label="この従業員情報を編集します">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(e)}>
                    Edit
                  </Button>
                </Tooltip>
                <Tooltip label="この行をコピーして新しい従業員を作成します">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDuplicate(e)}
                  >
                    Copy
                  </Button>
                </Tooltip>
                <Tooltip
                  label={
                    e.isActive
                      ? 'この従業員を無効化します'
                      : 'この従業員を有効化します'
                  }
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busyId === e.id}
                    onClick={() => onToggleActive(e)}
                  >
                    {e.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </Tooltip>
              </RowActions>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
