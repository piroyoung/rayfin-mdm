/**
 * Create / copy form for a territory placement. Presentational: owns only the
 * ephemeral draft state and calls the passed submit handler when valid.
 */
import { useState } from 'react';

import { accountName } from '@/domain/models/account';
import type { TerritoryAssignmentInput } from '@/domain/repositories/territory-account-assignment-repository';
import type { Account, FiscalYear, Territory } from '@/domain/types';
import { Field, FormActions, Input, Select } from '@/components/shared';

interface PlacementFormProps {
  initial: TerritoryAssignmentInput;
  accounts: Account[];
  territories: Territory[];
  fiscalYears: FiscalYear[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: TerritoryAssignmentInput) => void;
}

export function PlacementForm({
  initial,
  accounts,
  territories,
  fiscalYears,
  saving,
  onCancel,
  onSubmit,
}: PlacementFormProps) {
  const [form, setForm] = useState<TerritoryAssignmentInput>(initial);
  const set = (patch: Partial<TerritoryAssignmentInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const valid = form.accountId && form.territoryId && form.fiscalYearId;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Account" required>
            <Select
              value={form.accountId}
              onChange={(e) => set({ accountId: e.target.value })}
              required
            >
              <option value="">— select an account —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {accountName(a)} ({a.accountNumber})
                </option>
              ))}
            </Select>
          </Field>
        </div>
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
        <Field label="Assignment type" hint="Optional, e.g. primary, overlay">
          <Input
            value={form.assignmentType ?? ''}
            onChange={(e) => set({ assignmentType: e.target.value || undefined })}
          />
        </Field>
      </div>

      <FormActions
        onCancel={onCancel}
        saving={saving}
        disabled={!valid}
        submitLabel="Create"
      />
    </form>
  );
}
