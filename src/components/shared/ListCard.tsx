import type { ReactNode } from 'react';

import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { Spinner } from './Spinner';

/**
 * A list Card that renders its toolbar then switches between loading, error,
 * empty and content (the table) states — the scaffold every master-table page
 * otherwise repeats verbatim. Pass the `<table>` as children.
 */
export function ListCard({
  toolbar,
  loading,
  error,
  isEmpty,
  loadingLabel,
  errorTitle,
  emptyTitle,
  emptyDescription,
  className,
  children,
}: {
  toolbar?: ReactNode;
  loading: boolean;
  error?: string | null;
  isEmpty: boolean;
  loadingLabel: string;
  errorTitle: string;
  emptyTitle: string;
  emptyDescription?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      {toolbar}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label={loadingLabel} />
        </div>
      ) : error ? (
        <EmptyState title={errorTitle} description={error} />
      ) : isEmpty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </Card>
  );
}
