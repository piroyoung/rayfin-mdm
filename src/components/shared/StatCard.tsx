import type { ReactNode } from 'react';

import { cn } from '@/lib/format';
import type { BadgeTone } from '@/domain/types';

import { Card } from './Card';

const ACCENT: Record<BadgeTone, string> = {
  gray: 'text-gray-600',
  blue: 'text-blue-600',
  green: 'text-green-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  purple: 'text-purple-600',
  slate: 'text-slate-600',
  indigo: 'text-indigo-600',
};

export function StatCard({
  label,
  value,
  hint,
  tone = 'indigo',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
        {label}
      </p>
      <p className={cn('mt-1 text-2xl font-semibold', ACCENT[tone])}>{value}</p>
      {hint != null && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </Card>
  );
}
