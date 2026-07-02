/**
 * Employee identity-conflict rule: alias / UPN / email must be unique among
 * active employees. Pure — consumed by the Employees screen for inline warnings
 * and by the data-quality rules.
 */
import type { Employee } from '@/domain/types';

export interface EmployeeIdentityConflict {
  field: 'alias' | 'upn' | 'email';
  value: string;
  ids: string[];
}

const normKey = (v?: string | null) => (v ?? '').trim().toLowerCase();

/**
 * Find alias / UPN / email values shared by more than one *active* employee.
 */
export function findEmployeeIdentityConflicts(
  rows: Employee[]
): EmployeeIdentityConflict[] {
  const active = rows.filter((r) => r.isActive);
  const fields: Array<EmployeeIdentityConflict['field']> = [
    'alias',
    'upn',
    'email',
  ];
  const conflicts: EmployeeIdentityConflict[] = [];
  for (const field of fields) {
    const byValue = new Map<string, { value: string; ids: string[] }>();
    for (const e of active) {
      const key = normKey(e[field]);
      if (!key) continue;
      const hit = byValue.get(key) ?? { value: e[field] as string, ids: [] };
      hit.ids.push(e.id);
      byValue.set(key, hit);
    }
    for (const { value, ids } of byValue.values()) {
      if (ids.length > 1) conflicts.push({ field, value, ids });
    }
  }
  return conflicts;
}
