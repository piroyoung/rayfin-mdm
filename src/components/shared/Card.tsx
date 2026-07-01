import type { ReactNode } from 'react';

import { cn } from '@/lib/format';

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}
