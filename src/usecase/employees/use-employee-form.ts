/** Draft state, mutation, and validity for the employee create/edit form. */
import { useState } from 'react';

import type { EmployeeInput } from '@/domain/repositories/employee-repository';

export const EMPTY_EMPLOYEE: EmployeeInput = { displayName: '' };

export interface EmployeeFormState {
  form: EmployeeInput;
  set: (patch: Partial<EmployeeInput>) => void;
  valid: boolean;
}

export function useEmployeeForm(initial: EmployeeInput): EmployeeFormState {
  const [form, setForm] = useState<EmployeeInput>(initial);
  const set = (patch: Partial<EmployeeInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const valid = (form.displayName ?? '').trim() !== '';
  return { form, set, valid };
}
