import type { ReactNode } from 'react';

/** Right-aligned cluster of per-row action buttons. */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-1">{children}</div>;
}
