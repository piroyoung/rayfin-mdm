/** Presentational create/edit form for a territory. */
import type { TerritoryInput } from '@/domain/repositories/territory-repository';
import type { FiscalYear, Territory } from '@/domain/types';
import { Field, FormActions, Input, Select } from '@/components/shared';
import { useTerritoryForm } from '@/usecase/territories/use-territory-form';

export function TerritoryForm({
  initial,
  selfId,
  territories,
  fiscalYears,
  saving,
  onCancel,
  onSubmit,
}: {
  initial: TerritoryInput;
  selfId?: string;
  territories: Territory[];
  fiscalYears: FiscalYear[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: TerritoryInput) => void;
}) {
  const { form, set, valid } = useTerritoryForm(initial);
  const parentOptions = territories.filter((t) => t.id !== selfId);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Territory code" required>
          <Input
            value={form.territoryCode}
            onChange={(e) => set({ territoryCode: e.target.value })}
            placeholder="JPN.SMECC.RTL.0303"
            required
          />
        </Field>
        <Field label="Territory name" required>
          <Input
            value={form.territoryName}
            onChange={(e) => set({ territoryName: e.target.value })}
            placeholder="Japan POD #03"
            required
          />
        </Field>
        <Field label="Type" hint="POD, SALES_TERRITORY, SEGMENT…">
          <Input
            value={form.territoryType ?? ''}
            onChange={(e) => set({ territoryType: e.target.value })}
          />
        </Field>
        <Field label="Fiscal year">
          <Select
            value={form.fiscalYearId ?? ''}
            onChange={(e) => set({ fiscalYearId: e.target.value || undefined })}
          >
            <option value="">— none —</option>
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                {fy.code}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Parent territory">
          <Select
            value={form.parentTerritoryId ?? ''}
            onChange={(e) =>
              set({ parentTerritoryId: e.target.value || undefined })
            }
          >
            <option value="">— none —</option>
            {parentOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.territoryCode} — {t.territoryName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Segment code">
          <Input
            value={form.segmentCode ?? ''}
            onChange={(e) => set({ segmentCode: e.target.value })}
          />
        </Field>
        <Field label="Industry code">
          <Input
            value={form.industryCode ?? ''}
            onChange={(e) => set({ industryCode: e.target.value })}
          />
        </Field>
        <Field label="Region">
          <Input
            value={form.region ?? ''}
            onChange={(e) => set({ region: e.target.value })}
          />
        </Field>
        <Field label="Country code" hint="ISO-2, e.g. JP">
          <Input
            value={form.countryCode ?? ''}
            maxLength={2}
            onChange={(e) => set({ countryCode: e.target.value.toUpperCase() })}
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
