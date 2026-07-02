/** Presentational accounts table. Row-action visibility comes from domain
 * predicates; all actions are passed in as handlers. */
import {
  accountName,
  canArchiveAccount,
  canDeleteAccount,
  canEditAccount,
  canSubmitAccount,
} from '@/domain/models/account';
import {
  labelledMeta,
  RECORD_STATUS_META,
  SEGMENT_META,
  tonedMeta,
  type Account,
} from '@/domain/types';
import {
  Badge,
  Button,
  QualityBadge,
  RowActions,
  Tooltip,
} from '@/components/shared';
import { fmtRelative } from '@/lib/format';

export function AccountsTable({
  accounts,
  busyId,
  onEdit,
  onDuplicate,
  onSubmit,
  onArchive,
  onDelete,
}: {
  accounts: Account[];
  busyId: string | null;
  onEdit: (account: Account) => void;
  onDuplicate: (account: Account) => void;
  onSubmit: (account: Account) => void;
  onArchive: (account: Account) => void;
  onDelete: (account: Account) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
          <th className="px-4 py-3">Account</th>
          <th className="px-4 py-3">Segment</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Quality</th>
          <th className="px-4 py-3">Updated</th>
          <th className="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {accounts.map((a) => (
          <tr key={a.id} className="hover:bg-gray-50/60">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                {a.isGolden && (
                  <span title="Golden record" className="text-amber-500">
                    ★
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {accountName(a)}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {a.accountNumber}
                    {a.city ? ` · ${a.city}` : ''}
                    {a.countryCode ? `, ${a.countryCode}` : ''}
                  </p>
                </div>
              </div>
            </td>
            <td className="px-4 py-3 text-gray-600">
              {a.segmentCode
                ? labelledMeta(SEGMENT_META, a.segmentCode).label
                : '—'}
            </td>
            <td className="px-4 py-3">
              <Badge tone={tonedMeta(RECORD_STATUS_META, a.status).tone}>
                {tonedMeta(RECORD_STATUS_META, a.status).label}
              </Badge>
            </td>
            <td className="px-4 py-3">
              <QualityBadge score={a.qualityScore} />
            </td>
            <td className="px-4 py-3 text-xs text-gray-500">
              {fmtRelative(a.updatedAt)}
            </td>
            <td className="px-4 py-3">
              <RowActions>
                {canEditAccount(a.status) && (
                  <Tooltip label="このアカウント情報を編集します">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(a)}
                    >
                      Edit
                    </Button>
                  </Tooltip>
                )}
                <Tooltip label="この行をコピーして新しいアカウントを作成します">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDuplicate(a)}
                  >
                    Copy
                  </Button>
                </Tooltip>
                {canSubmitAccount(a.status) && (
                  <Tooltip label="このアカウントレコードを承認に提出します">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busyId === a.id}
                      onClick={() => onSubmit(a)}
                    >
                      Submit
                    </Button>
                  </Tooltip>
                )}
                {canArchiveAccount(a.status) && (
                  <Tooltip label="このアカウントレコードをアーカイブ（保管）します">
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busyId === a.id}
                      onClick={() => onArchive(a)}
                    >
                      Archive
                    </Button>
                  </Tooltip>
                )}
                {canDeleteAccount(a.status) && (
                  <Tooltip label="このアカウントレコードを完全に削除します（取り消せません）">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => onDelete(a)}
                    >
                      Delete
                    </Button>
                  </Tooltip>
                )}
              </RowActions>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
