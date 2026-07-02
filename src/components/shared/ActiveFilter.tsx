import type { ActiveFilterValue } from '@/lib/listing';

import { Select } from './Select';

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
