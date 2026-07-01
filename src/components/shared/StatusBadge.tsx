import { Badge } from './Badge';

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
