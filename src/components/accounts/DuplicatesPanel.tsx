/** Collapsible amber banner listing potential-duplicate account groups. */
import type { DuplicateGroup } from '@/domain/duplicates';
import type { Account } from '@/domain/types';
import { Card } from '@/components/shared';

import { DuplicateGroupCard } from './DuplicateGroupCard';

export function DuplicatesPanel({
  duplicates,
  open,
  onToggle,
  busyId,
  onMerge,
}: {
  duplicates: DuplicateGroup<Account>[];
  open: boolean;
  onToggle: () => void;
  busyId: string | null;
  onMerge: (groupKey: string, winner: Account, losers: Account[]) => void;
}) {
  if (duplicates.length === 0) return null;
  return (
    <Card className="border-amber-200 bg-amber-50/40 p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={onToggle}
      >
        <span className="text-sm font-medium text-amber-800">
          ⚠ {duplicates.length} potential duplicate group
          {duplicates.length > 1 ? 's' : ''} detected
        </span>
        <span className="text-xs text-amber-700">
          {open ? 'Hide' : 'Review & merge'}
        </span>
      </button>
      {open && (
        <div className="mt-4 space-y-4">
          {duplicates.map((group) => (
            <DuplicateGroupCard
              key={group.key}
              records={group.records}
              reasons={group.reasons}
              busy={busyId === group.key}
              onMerge={(winner, losers) => onMerge(group.key, winner, losers)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
