/** Presentational create/edit form for a role. Draft state lives in the hook. */
import type { RoleInput } from '@/domain/repositories/role-repository';
import {
  Field,
  FormActions,
  Input,
  Select,
  Textarea,
} from '@/components/shared';
import { useRoleForm } from '@/usecase/roles/use-role-form';

export function RoleForm({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial: RoleInput;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: RoleInput) => void;
}) {
  const { form, set, valid } = useRoleForm(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" required>
          <Input
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Account Executive"
            required
          />
        </Field>
        <Field label="Org unit" hint="STU, CSU, GPS…">
          <Input
            value={form.orgUnit ?? ''}
            onChange={(e) => set({ orgUnit: e.target.value || undefined })}
          />
        </Field>
        <Field label="Solution area">
          <Input
            value={form.solutionArea ?? ''}
            onChange={(e) => set({ solutionArea: e.target.value || undefined })}
          />
        </Field>
        <Field label="Sub area">
          <Input
            value={form.subArea ?? ''}
            onChange={(e) => set({ subArea: e.target.value || undefined })}
          />
        </Field>
        <Field label="Role family" hint="Sales, Technical, Customer Success…">
          <Input
            value={form.roleFamily ?? ''}
            onChange={(e) => set({ roleFamily: e.target.value || undefined })}
          />
        </Field>
        <Field label="Sort order">
          <Input
            type="number"
            value={form.sortOrder ?? ''}
            onChange={(e) =>
              set({
                sortOrder:
                  e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
          />
        </Field>
        <Field label="Account assignable" hint="Can attach to an account team">
          <Select
            value={form.isAccountAssignable ? 'yes' : 'no'}
            onChange={(e) =>
              set({ isAccountAssignable: e.target.value === 'yes' })
            }
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </Field>
        <Field label="Territory assignable" hint="Can own / anchor a territory">
          <Select
            value={form.isTerritoryAssignable ? 'yes' : 'no'}
            onChange={(e) =>
              set({ isTerritoryAssignable: e.target.value === 'yes' })
            }
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
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
        <div className="sm:col-span-2">
          <Field label="Description">
            <Textarea
              rows={2}
              value={form.description ?? ''}
              onChange={(e) => set({ description: e.target.value || undefined })}
            />
          </Field>
        </div>
      </div>

      <FormActions onCancel={onCancel} saving={saving} disabled={!valid} />
    </form>
  );
}
