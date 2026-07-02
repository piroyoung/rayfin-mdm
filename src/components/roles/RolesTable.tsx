/** Presentational roles table. All actions are passed in as handlers. */
import type { Role } from '@/domain/types';
import {
  Badge,
  Button,
  RowActions,
  StatusBadge,
  Tooltip,
} from '@/components/shared';
import { fmtRelative } from '@/lib/format';

export function RolesTable({
  roles,
  busyId,
  onEdit,
  onDuplicate,
  onToggleActive,
}: {
  roles: Role[];
  busyId: string | null;
  onEdit: (role: Role) => void;
  onDuplicate: (role: Role) => void;
  onToggleActive: (role: Role) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
          <th className="px-4 py-3">Role</th>
          <th className="px-4 py-3">Assignable</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Created</th>
          <th className="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {roles.map((r) => (
          <tr key={r.id} className="hover:bg-gray-50/60">
            <td className="px-4 py-3">
              <p className="font-medium text-gray-900">{r.name}</p>
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1">
                {r.isAccountAssignable && <Badge tone="blue">Account</Badge>}
                {r.isTerritoryAssignable && (
                  <Badge tone="purple">Territory</Badge>
                )}
                {!r.isAccountAssignable && !r.isTerritoryAssignable && (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            </td>
            <td className="px-4 py-3">
              <StatusBadge active={r.isActive} />
            </td>
            <td className="px-4 py-3 text-xs text-gray-500">
              {fmtRelative(r.createdAt)}
            </td>
            <td className="px-4 py-3">
              <RowActions>
                <Tooltip label="このロールを編集します">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(r)}>
                    Edit
                  </Button>
                </Tooltip>
                <Tooltip label="この行をコピーして新しいロールを作成します">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDuplicate(r)}
                  >
                    Copy
                  </Button>
                </Tooltip>
                <Tooltip
                  label={
                    r.isActive
                      ? 'このロールを無効化します'
                      : 'このロールを有効化します'
                  }
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busyId === r.id}
                    onClick={() => onToggleActive(r)}
                  >
                    {r.isActive ? 'Deactivate' : 'Activate'}
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
