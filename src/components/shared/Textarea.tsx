import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/format';

import { CONTROL_CLASS } from './control';

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cn(CONTROL_CLASS, className)} />;
}
