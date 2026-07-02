/** Presentational amber banner listing active-employee identity conflicts. */
import type { EmployeeIdentityConflict } from '@/domain/policies/employee-conflicts';
import { Card } from '@/components/shared';

export function IdentityConflictsCard({
  conflicts,
}: {
  conflicts: EmployeeIdentityConflict[];
}) {
  if (conflicts.length === 0) return null;
  return (
    <Card className="border-amber-200 bg-amber-50/40 p-4">
      <p className="text-sm font-medium text-amber-800">
        ⚠ {conflicts.length} identity conflict
        {conflicts.length > 1 ? 's' : ''} among active employees
      </p>
      <ul className="mt-2 space-y-1 text-xs text-amber-700">
        {conflicts.map((c) => (
          <li key={`${c.field}:${c.value}`}>
            Duplicate <span className="font-medium">{c.field}</span> “{c.value}”
            shared by {c.ids.length} employees
          </li>
        ))}
      </ul>
    </Card>
  );
}
