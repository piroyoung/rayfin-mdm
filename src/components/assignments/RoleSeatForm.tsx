/**
 * Create / copy form for a territory role seat. Presentational: owns only the
 * ephemeral draft state and calls the passed submit handler when valid.
 */
import { useState } from 'react';

import type { TerritoryRoleAssignmentInput } from '@/domain/repositories/territory-role-assignment-repository';
import type { Employee, FiscalYear, Role, Territory } from '@/domain/types';
import { Field, FormActions, Select } from '@/components/shared';

interface RoleSeatFormProps {
  initial: TerritoryRoleAssignmentInput;
  territories: Territory[];
  employees: Employee[];
  fiscalYears: FiscalYear[];
  roles: Role[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: TerritoryRoleAssignmentInput) => void;
}

export function RoleSeatForm({
  initial,
  territories,
  employees,
  fiscalYears,
  roles,
  saving,
  onCancel,
  onSubmit,
}: RoleSeatFormProps) {
  const [form, setForm] = useState<TerritoryRoleAssignmentInput>(initial);
  const set = (patch: Partial<TerritoryRoleAssignmentInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const valid =
    form.territoryId && form.employeeId && form.fiscalYearId && form.roleTypeCode;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Territory" required>
          <Select
            value={form.territoryId}
            onChange={(e) => set({ territoryId: e.target.value })}
            required
          >
            <option value="">— select —</option>
            {territories.map((t) => (
              <option key={t.id} value={t.id}>
                {t.territoryCode} — {t.territoryName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Role" required>
          <Select
            value={form.roleTypeCode}
            onChange={(e) => set({ roleTypeCode: e.target.value })}
            required
          >
            <option value="">— select —</option>
            {roles
              .filter((r) => r.isActive)
              .map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} — {r.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Employee" required>
          <Select
            value={form.employeeId}
            onChange={(e) => set({ employeeId: e.target.value })}
            required
          >
            <option value="">— select —</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.alias ? `${emp.displayName} (${emp.alias})` : emp.displayName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fiscal year" required>
          <Select
            value={form.fiscalYearId}
            onChange={(e) => set({ fiscalYearId: e.target.value })}
            required
          >
            <option value="">— select —</option>
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                {fy.code}
                {fy.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        One seat per territory / role / fiscal year. Use the Territory Roster
        page to swap a seat holder with history preserved.
      </p>

      <FormActions
        onCancel={onCancel}
        saving={saving}
        disabled={!valid}
        submitLabel="Create"
      />
    </form>
  );
}
