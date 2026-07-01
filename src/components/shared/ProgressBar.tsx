import { cn } from '@/lib/format';
import type { BadgeTone } from '@/domain/types';

const BAR_TONES: Record<BadgeTone, string> = {
  gray: 'bg-gray-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  slate: 'bg-slate-500',
  indigo: 'bg-indigo-500',
};

export function ProgressBar({
  value,
  tone = 'indigo',
}: {
  value: number;
  tone?: BadgeTone;
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={cn('h-full rounded-full transition-all', BAR_TONES[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
