/** Presentational territories table. All actions are passed in as handlers. */
import type { Territory } from '@/domain/types';
import {
  Button,
  RowActions,
  StatusBadge,
  Tooltip,
} from '@/components/shared';

export function TerritoriesTable({
  territories,
  busyId,
  fyCode,
  onEdit,
  onDuplicate,
  onToggleActive,
}: {
  territories: Territory[];
  busyId: string | null;
  fyCode: (id: string) => string;
  onEdit: (territory: Territory) => void;
  onDuplicate: (territory: Territory) => void;
  onToggleActive: (territory: Territory) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
          <th className="px-4 py-3">Territory</th>
          <th className="px-4 py-3">Type</th>
          <th className="px-4 py-3">Fiscal year</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {territories.map((t) => (
          <tr key={t.id} className="hover:bg-gray-50/60">
            <td className="px-4 py-3">
              <p className="truncate font-medium text-gray-900">
                {t.territoryName}
              </p>
              <p className="truncate text-xs text-gray-500">
                {t.territoryCode}
                {t.region ? ` · ${t.region}` : ''}
              </p>
            </td>
            <td className="px-4 py-3 text-gray-600">{t.territoryType ?? '—'}</td>
            <td className="px-4 py-3 text-gray-600">
              {fyCode(t.fiscalYearId ?? '')}
            </td>
            <td className="px-4 py-3">
              <StatusBadge active={t.isActive} />
            </td>
            <td className="px-4 py-3">
              <RowActions>
                <Tooltip label="このテリトリーを編集します">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(t)}>
                    Edit
                  </Button>
                </Tooltip>
                <Tooltip label="この行をコピーして新しいテリトリーを作成します">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDuplicate(t)}
                  >
                    Copy
                  </Button>
                </Tooltip>
                <Tooltip
                  label={
                    t.isActive
                      ? 'このテリトリーを無効化します'
                      : 'このテリトリーを有効化します'
                  }
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busyId === t.id}
                    onClick={() => onToggleActive(t)}
                  >
                    {t.isActive ? 'Deactivate' : 'Activate'}
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
