/** One duplicate group with survivorship selection. Winner selection is local
 * ephemeral UI state; the merge itself is delegated up via onMerge. */
import { useState } from 'react';

import { accountName } from '@/domain/models/account';
import { RECORD_STATUS_META, tonedMeta, type Account } from '@/domain/types';
import { Badge, Button, QualityBadge, Tooltip } from '@/components/shared';

export function DuplicateGroupCard({
  records,
  reasons,
  busy,
  onMerge,
}: {
  records: Account[];
  reasons: string[];
  busy: boolean;
  onMerge: (winner: Account, losers: Account[]) => void;
}) {
  const [winnerId, setWinnerId] = useState(
    () =>
      [...records].sort(
        (a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0)
      )[0].id
  );

  return (
    <div className="rounded-lg border border-amber-200 bg-white p-3">
      <p className="mb-2 text-xs text-amber-700">Match: {reasons.join(', ')}</p>
      <div className="space-y-1.5">
        {records.map((r) => (
          <label
            key={r.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-amber-50"
          >
            <input
              type="radio"
              name={`winner-${records[0].id}`}
              checked={winnerId === r.id}
              onChange={() => setWinnerId(r.id)}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
              {accountName(r)}{' '}
              <span className="text-xs text-gray-500">({r.accountNumber})</span>
            </span>
            <QualityBadge score={r.qualityScore} />
            <Badge tone={tonedMeta(RECORD_STATUS_META, r.status).tone}>
              {tonedMeta(RECORD_STATUS_META, r.status).label}
            </Badge>
          </label>
        ))}
      </div>
      <div className="mt-2 flex justify-end">
        <Tooltip
          label="選択したレコードを正として残し、残りを 1 件に統合（名寄せ）します"
          side="top"
        >
          <Button
            size="sm"
            variant="primary"
            loading={busy}
            onClick={() => {
              const winner = records.find((r) => r.id === winnerId)!;
              onMerge(
                winner,
                records.filter((r) => r.id !== winnerId)
              );
            }}
          >
            Keep selected &amp; merge rest
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
