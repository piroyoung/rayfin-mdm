import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/format';

import { CONTROL_CLASS } from './control';

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(CONTROL_CLASS, className)} />;
}
