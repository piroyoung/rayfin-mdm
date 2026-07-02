import type { ReactNode } from 'react';

import { Input } from './Input';

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
