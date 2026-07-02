import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/format';

import { CONTROL_CLASS } from './control';

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cn(CONTROL_CLASS, 'pr-8', className)}>
      {children}
    </select>
  );
}
