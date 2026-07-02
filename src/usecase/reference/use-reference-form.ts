/** Draft state, mutation, and validity for the reference create/edit form. */
import { useState } from 'react';

import type { ReferenceInput } from '@/domain/repositories/reference-repository';

export const EMPTY_REFERENCE: ReferenceInput = {
  setName: '',
  code: '',
  label: '',
  isActive: true,
  sortOrder: 0,
};

export interface ReferenceFormState {
  form: ReferenceInput;
  set: (patch: Partial<ReferenceInput>) => void;
  valid: boolean;
}

export function useReferenceForm(initial: ReferenceInput): ReferenceFormState {
  const [form, setForm] = useState<ReferenceInput>(initial);
  const set = (patch: Partial<ReferenceInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const valid =
    (form.setName ?? '').trim() !== '' &&
    (form.code ?? '').trim() !== '' &&
    (form.label ?? '').trim() !== '';
  return { form, set, valid };
}
