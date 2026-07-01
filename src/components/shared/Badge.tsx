import type { ReactNode } from 'react';

import { cn } from '@/lib/format';
import type { BadgeTone } from '@/domain/types';

const BADGE_TONES: Record<BadgeTone, string> = {
  gray: 'bg-gray-100 text-gray-700 ring-gray-200',
  blue: 'bg-blue-100 text-blue-700 ring-blue-200',
  green: 'bg-green-100 text-green-700 ring-green-200',
  amber: 'bg-amber-100 text-amber-800 ring-amber-200',
  red: 'bg-red-100 text-red-700 ring-red-200',
  purple: 'bg-purple-100 text-purple-700 ring-purple-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
};

export function Badge({
  tone = 'gray',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
