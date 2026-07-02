/** Presentational create/edit form for a reference value. */
import { useState } from 'react';

import type { ReferenceInput } from '@/domain/repositories/reference-repository';
import { Button, Field, Input, Select, Tooltip } from '@/components/shared';
import { useReferenceForm } from '@/usecase/reference/use-reference-form';

export function ReferenceForm({
  initial,
  knownSets,
  saving,
  onCancel,
  onSubmit,
}: {
  initial: ReferenceInput;
  knownSets: string[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: ReferenceInput) => void;
}) {
  const { form, set, valid } = useReferenceForm(initial);
  const [newSet, setNewSet] = useState(
    initial.setName === '' || !knownSets.includes(initial.setName)
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="List / set">
          {knownSets.length > 0 && !newSet ? (
            <div className="flex gap-2">
              <Select
                value={form.setName}
                onChange={(e) => set({ setName: e.target.value })}
              >
                <option value="">Select…</option>
                {knownSets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Tooltip label="新しいリスト（セット）を作成します" side="bottom">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNewSet(true);
                    set({ setName: '' });
                  }}
                >
                  New
                </Button>
              </Tooltip>
            </div>
          ) : (
            <Input
              value={form.setName}
              onChange={(e) => set({ setName: e.target.value })}
              placeholder="e.g. country"
            />
          )}
        </Field>
        <Field label="Sort order">
          <Input
            type="number"
            value={form.sortOrder ?? 0}
            onChange={(e) => set({ sortOrder: Number(e.target.value) })}
          />
        </Field>
        <Field label="Code" required>
          <Input
            value={form.code}
            onChange={(e) => set({ code: e.target.value })}
            placeholder="US"
            required
          />
        </Field>
        <Field label="Label" required>
          <Input
            value={form.label}
            onChange={(e) => set({ label: e.target.value })}
            placeholder="United States"
            required
          />
        </Field>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={form.isActive ?? true}
          onChange={(e) => set({ isActive: e.target.checked })}
        />
        Active
      </label>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={saving} disabled={!valid}>
          Save
        </Button>
      </div>
    </form>
  );
}
