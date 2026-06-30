/**
 * Cross-page building blocks for master-data list pages: the list Card with
 * its loading / error / empty states, the search + filter toolbar, the
 * per-row action cluster, the form footer, and the active-status pill.
 *
 * Centralising these keeps every table page (Role, Account, Employee,
 * Territory and the two assignment tables) visually and behaviourally
 * consistent, and means a tweak to, say, the empty state lands everywhere.
 */
import type { ReactNode } from 'react';

import type { ActiveFilterValue } from '@/lib/listing';
import { Badge, Button, Card, EmptyState, Input, Select, Spinner } from './ui';

/** Green "Active" / slate "Inactive" status pill. */
export function StatusBadge({
  active,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <Badge tone={active ? 'green' : 'slate'}>
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}

/** Right-aligned cluster of per-row action buttons. */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-1">{children}</div>;
}

/** Cancel + submit footer shared by every entity form. */
export function FormActions({
  onCancel,
  saving,
  disabled,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
}: {
  onCancel: () => void;
  saving?: boolean;
  disabled?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <Button variant="secondary" type="button" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        variant="primary"
        type="submit"
        loading={saving}
        disabled={disabled}
      >
        {submitLabel}
      </Button>
    </div>
  );
}

/** Search box (with optional trailing filters) above a list table. */
export function ListToolbar({
  search,
  onSearch,
  placeholder,
  children,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
      <div className="relative min-w-0 flex-1">
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      {children}
    </div>
  );
}

/** all / active-only / inactive-only dropdown. */
export function ActiveFilter({
  value,
  onChange,
}: {
  value: ActiveFilterValue;
  onChange: (value: ActiveFilterValue) => void;
}) {
  return (
    <Select
      className="w-44"
      value={value}
      onChange={(e) => onChange(e.target.value as ActiveFilterValue)}
    >
      <option value="all">All</option>
      <option value="active">Active only</option>
      <option value="inactive">Inactive only</option>
    </Select>
  );
}

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
