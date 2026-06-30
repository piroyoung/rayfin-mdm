/**
 * Employee master service: CRUD plus identity-conflict detection (alias / UPN /
 * email must be unique among active employees).
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import type { Employee } from '@/domain/types';

export interface EmployeeInput {
  personnelNumber?: string;
  alias?: string;
  upn?: string;
  email?: string;
  displayName: string;
  localName?: string;
  jobTitle?: string;
  roleTypeCode?: string;
  countryCode?: string;
  officeLocation?: string;
  employmentStatus?: string;
  isActive?: boolean;
}

function employees() {
  return getRayfinClient().data.Employee;
}

/** Keep in sync with rayfin/data/Employee.ts. */
const EMPLOYEE_FIELDS = [
  'id',
  'personnelNumber',
  'alias',
  'upn',
  'email',
  'displayName',
  'localName',
  'jobTitle',
  'roleTypeCode',
  'countryCode',
  'officeLocation',
  'employmentStatus',
  'isActive',
  'validFrom',
  'validTo',
  'currentFlag',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
] as const;

function label(e: { displayName: string; alias?: string }): string {
  return e.alias ? `${e.displayName} (${e.alias})` : e.displayName;
}

export async function listEmployees(): Promise<Employee[]> {
  const rows = await employees().select(EMPLOYEE_FIELDS).execute();
  return [...rows].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function getEmployee(id: string): Promise<Employee | null> {
  return employees()
    .select(EMPLOYEE_FIELDS)
    .where({ id: { eq: id } })
    .findFirst();
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const now = new Date();
  const created = await employees().create({
    ...input,
    isActive: input.isActive ?? true,
    validFrom: now,
    currentFlag: true,
    createdBy: actorId(),
    updatedBy: actorId(),
    createdAt: now,
    updatedAt: now,
  });
  await logAudit({
    domain: 'employee',
    action: 'create',
    recordId: created.id,
    recordLabel: label(input),
    summary: `Created employee ${input.displayName}`,
  });
  return created;
}

export async function updateEmployee(
  id: string,
  input: EmployeeInput
): Promise<Employee> {
  const updated = await employees().update(
    { id },
    {
      ...input,
      isActive: input.isActive ?? true,
      updatedBy: actorId(),
      updatedAt: new Date(),
    }
  );
  await logAudit({
    domain: 'employee',
    action: 'update',
    recordId: id,
    recordLabel: label(input),
    summary: `Updated employee ${input.displayName}`,
  });
  return updated;
}

export async function setEmployeeActive(
  record: Employee,
  isActive: boolean
): Promise<Employee> {
  const updated = await employees().update(
    { id: record.id },
    { isActive, updatedBy: actorId(), updatedAt: new Date() }
  );
  await logAudit({
    domain: 'employee',
    action: 'status_change',
    recordId: record.id,
    recordLabel: label(record),
    summary: `Employee ${record.displayName} → ${isActive ? 'active' : 'inactive'}`,
  });
  return updated;
}

export interface EmployeeIdentityConflict {
  field: 'alias' | 'upn' | 'email';
  value: string;
  ids: string[];
}

const normKey = (v?: string | null) => (v ?? '').trim().toLowerCase();

/**
 * Pure: find alias / UPN / email values shared by more than one *active*
 * employee. Used by the UI for inline warnings and by the Phase 4 DQ rules.
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
