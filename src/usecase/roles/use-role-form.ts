/** Draft state, mutation, and validity for the role create/edit form. */
import { useState } from 'react';

import type { RoleInput } from '@/domain/repositories/role-repository';

export const EMPTY_ROLE: RoleInput = {
  name: '',
  isAccountAssignable: true,
  isTerritoryAssignable: false,
};

export interface RoleFormState {
  form: RoleInput;
  set: (patch: Partial<RoleInput>) => void;
  valid: boolean;
}

export function useRoleForm(initial: RoleInput): RoleFormState {
  const [form, setForm] = useState<RoleInput>(initial);
  const set = (patch: Partial<RoleInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const valid = (form.name ?? '').trim() !== '';
  return { form, set, valid };
}
