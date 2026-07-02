/** Presentational create/edit form for an account. Draft state + live quality
 * score live in the form hook; this component only renders. */
import { optionsOf, SEGMENT_META } from '@/domain/types';
import type { AccountInput } from '@/domain/repositories/account-repository';
import {
  Field,
  FormActions,
  Input,
  ProgressBar,
  Select,
} from '@/components/shared';
import { useAccountForm } from '@/usecase/accounts/use-account-form';

export function AccountForm({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial: AccountInput;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: AccountInput) => void;
}) {
  const { form, set, valid, quality } = useAccountForm(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Account number" required>
          <Input
            value={form.accountNumber}
            onChange={(e) => set({ accountNumber: e.target.value })}
            placeholder="ACC-1001"
            required
          />
        </Field>
        <Field label="Segment">
          <Select
            value={form.segmentCode ?? ''}
            onChange={(e) => set({ segmentCode: e.target.value || undefined })}
          >
            <option value="">— Unspecified —</option>
            {optionsOf(SEGMENT_META).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Legal name" required>
          <Input
            value={form.nameLegal}
            onChange={(e) => set({ nameLegal: e.target.value })}
            placeholder="Contoso Ltd"
            required
          />
        </Field>
        <Field label="Display name">
          <Input
            value={form.nameDisplay ?? ''}
            onChange={(e) => set({ nameDisplay: e.target.value })}
            placeholder="Contoso"
          />
        </Field>
        <Field label="Local name">
          <Input
            value={form.nameLocal ?? ''}
            onChange={(e) => set({ nameLocal: e.target.value })}
            placeholder="日本コントソ株式会社"
          />
        </Field>
        <Field label="Industry code">
          <Input
            value={form.industryCode ?? ''}
            onChange={(e) => set({ industryCode: e.target.value })}
          />
        </Field>
        <Field label="Source system">
          <Input
            value={form.sourceSystem ?? ''}
            onChange={(e) => set({ sourceSystem: e.target.value })}
            placeholder="MSX, Excel, HR…"
          />
        </Field>
        <Field label="Country code" hint="ISO-2, e.g. US, GB, JP">
          <Input
            value={form.countryCode ?? ''}
            maxLength={2}
            onChange={(e) => set({ countryCode: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Region">
          <Input
            value={form.region ?? ''}
            onChange={(e) => set({ region: e.target.value })}
            placeholder="JP East, JP West…"
          />
        </Field>
        <Field label="Prefecture">
          <Input
            value={form.prefecture ?? ''}
            onChange={(e) => set({ prefecture: e.target.value })}
          />
        </Field>
        <Field label="City">
          <Input
            value={form.city ?? ''}
            onChange={(e) => set({ city: e.target.value })}
          />
        </Field>
      </div>

      <details className="mt-5 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          External IDs, hierarchy &amp; vertical coding
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="MSSales account ID">
            <Input
              value={form.msSalesAccountId ?? ''}
              onChange={(e) => set({ msSalesAccountId: e.target.value })}
            />
          </Field>
          <Field label="CRM account ID">
            <Input
              value={form.crmAccountId ?? ''}
              onChange={(e) => set({ crmAccountId: e.target.value })}
            />
          </Field>
          <Field label="Parent account ID">
            <Input
              value={form.parentAccountId ?? ''}
              onChange={(e) => set({ parentAccountId: e.target.value })}
            />
          </Field>
          <Field label="Global parent account ID">
            <Input
              value={form.globalParentAccountId ?? ''}
              onChange={(e) => set({ globalParentAccountId: e.target.value })}
            />
          </Field>
          <Field label="Vertical code">
            <Input
              value={form.verticalCode ?? ''}
              onChange={(e) => set({ verticalCode: e.target.value })}
            />
          </Field>
          <Field label="Sub-vertical code">
            <Input
              value={form.subVerticalCode ?? ''}
              onChange={(e) => set({ subVerticalCode: e.target.value })}
            />
          </Field>
          <Field label="Vertical category code">
            <Input
              value={form.verticalCategoryCode ?? ''}
              onChange={(e) => set({ verticalCategoryCode: e.target.value })}
            />
          </Field>
          <Field label="Sub-segment code">
            <Input
              value={form.subSegmentCode ?? ''}
              onChange={(e) => set({ subSegmentCode: e.target.value })}
            />
          </Field>
        </div>
      </details>

      <div className="mt-5 rounded-lg bg-gray-50 p-3">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Live quality score</span>
          <span className="text-gray-900">{quality.score}%</span>
        </div>
        <ProgressBar
          value={quality.score}
          tone={
            quality.score >= 80 ? 'green' : quality.score >= 50 ? 'amber' : 'red'
          }
        />
        {quality.missing.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            Missing: {quality.missing.join(', ')}
          </p>
        )}
        {quality.invalid.length > 0 && (
          <p className="mt-1 text-xs text-red-600">
            Invalid: {quality.invalid.join(', ')}
          </p>
        )}
      </div>

      <FormActions onCancel={onCancel} saving={saving} disabled={!valid} />
    </form>
  );
}
