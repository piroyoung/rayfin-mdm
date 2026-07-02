/**
 * Draft state, mutation, and validity for the territory create/edit form. The
 * component stays presentational and never re-derives validity.
 */
import { useState } from 'react';

import type { TerritoryInput } from '@/domain/repositories/territory-repository';

export const EMPTY_TERRITORY: TerritoryInput = {
  territoryCode: '',
  territoryName: '',
};

export interface TerritoryFormState {
  form: TerritoryInput;
  set: (patch: Partial<TerritoryInput>) => void;
  valid: boolean;
}

export function useTerritoryForm(initial: TerritoryInput): TerritoryFormState {
  const [form, setForm] = useState<TerritoryInput>(initial);
  const set = (patch: Partial<TerritoryInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const valid =
    (form.territoryCode ?? '').trim() !== '' &&
    (form.territoryName ?? '').trim() !== '';
  return { form, set, valid };
}
