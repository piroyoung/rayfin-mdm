/** Presentational create/edit form for an employee. Draft state lives in the hook. */
import { employeeInputFromUser } from '@/domain/policies/employee-identity';
import type { EmployeeInput } from '@/domain/repositories/employee-repository';
import type { Role } from '@/domain/types';
import { Button, Field, FormActions, Input, Select } from '@/components/shared';
import { useAuth } from '@/usecase/auth/auth-context';
import { useEmployeeForm } from '@/usecase/employees/use-employee-form';

export function EmployeeForm({
  initial,
  saving,
  roles,
  onCancel,
  onSubmit,
}: {
  initial: EmployeeInput;
  saving: boolean;
  roles: Role[];
  onCancel: () => void;
  onSubmit: (input: EmployeeInput) => void;
}) {
  const { form, set, valid } = useEmployeeForm(initial);
  const { user } = useAuth();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      {user && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-indigo-50/60 px-3 py-2">
          <p className="text-xs text-indigo-700">
            Every employee is a tenant user. Prefill this form from the account
            you&apos;re signed in as.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => set(employeeInputFromUser(user))}
          >
            Use my account
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Display name" required>
          <Input
            value={form.displayName}
            onChange={(e) => set({ displayName: e.target.value })}
            placeholder="Hanako Mizukami"
            required
          />
        </Field>
        <Field label="Local name">
          <Input
            value={form.localName ?? ''}
            onChange={(e) => set({ localName: e.target.value })}
            placeholder="水上 花子"
          />
        </Field>
        <Field label="Alias" hint="Source-workbook login, e.g. HMIZUKAMI">
          <Input
            value={form.alias ?? ''}
            onChange={(e) => set({ alias: e.target.value })}
          />
        </Field>
        <Field label="Personnel number">
          <Input
            value={form.personnelNumber ?? ''}
            onChange={(e) => set({ personnelNumber: e.target.value })}
          />
        </Field>
        <Field label="UPN">
          <Input
            value={form.upn ?? ''}
            onChange={(e) => set({ upn: e.target.value })}
            placeholder="hmizukami@contoso.com"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email ?? ''}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
        <Field
          label="Entra object ID"
          hint="Durable tenant identity (oid). Set via “Use my account”."
        >
          <Input
            value={form.entraObjectId ?? ''}
            onChange={(e) => set({ entraObjectId: e.target.value || undefined })}
            placeholder="—"
          />
        </Field>
        <Field label="Job title">
          <Input
            value={form.jobTitle ?? ''}
            onChange={(e) => set({ jobTitle: e.target.value })}
          />
        </Field>
        <Field
          label="Home role"
          hint="The role this person is normally staffed as"
        >
          <Select
            value={form.roleTypeCode ?? ''}
            onChange={(e) => set({ roleTypeCode: e.target.value || undefined })}
          >
            <option value="">— None —</option>
            {roles.map((r) => (
              <option key={r.code} value={r.code}>
                {r.code} — {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Country code" hint="ISO-2, e.g. JP">
          <Input
            value={form.countryCode ?? ''}
            maxLength={2}
            onChange={(e) => set({ countryCode: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Office location">
          <Input
            value={form.officeLocation ?? ''}
            onChange={(e) => set({ officeLocation: e.target.value })}
          />
        </Field>
        <Field label="Employment status">
          <Input
            value={form.employmentStatus ?? ''}
            onChange={(e) => set({ employmentStatus: e.target.value })}
            placeholder="Active, Leave…"
          />
        </Field>
        <Field label="Active">
          <Select
            value={form.isActive === false ? 'no' : 'yes'}
            onChange={(e) => set({ isActive: e.target.value === 'yes' })}
          >
            <option value="yes">Active</option>
            <option value="no">Inactive</option>
          </Select>
        </Field>
      </div>

      <FormActions onCancel={onCancel} saving={saving} disabled={!valid} />
    </form>
  );
}
