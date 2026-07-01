/** Presentational grouped card grid of governed reference values. */
import { Badge, Card, Tooltip } from '@/components/shared';
import type { ReferenceGroup } from '@/usecase/reference/selectors';
import type { ReferenceValue } from '@/domain/types';

export function ReferenceGroups({
  groups,
  busyId,
  onEdit,
  onDelete,
}: {
  groups: ReferenceGroup[];
  busyId: string | null;
  onEdit: (value: ReferenceValue) => void;
  onDelete: (value: ReferenceValue) => void;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {groups.map((group) => (
        <Card key={group.setName} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
              {group.setName}
            </h2>
            <span className="text-xs text-gray-500">
              {group.values.length} value
              {group.values.length > 1 ? 's' : ''}
            </span>
          </div>
          <ul className="divide-y divide-gray-50">
            {group.values.map((value) => (
              <li
                key={value.id}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50/60"
              >
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                  {value.code}
                </code>
                <span className="min-w-0 flex-1 truncate text-gray-800">
                  {value.label}
                </span>
                {!value.isActive && <Badge tone="gray">Inactive</Badge>}
                <Tooltip label="この参照値を編集します">
                  <button
                    type="button"
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                    onClick={() => onEdit(value)}
                  >
                    Edit
                  </button>
                </Tooltip>
                <Tooltip label="この参照値を削除します">
                  <button
                    type="button"
                    className="text-xs font-medium text-red-600 hover:text-red-500 disabled:opacity-50"
                    disabled={busyId === value.id}
                    onClick={() => onDelete(value)}
                  >
                    Delete
                  </button>
                </Tooltip>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
