/**
 * Draft state, mutation, validity, and the live quality preview for the account
 * create/edit form. The quality score is a domain calculation surfaced to the
 * view so the component never re-derives it.
 */
import { useState } from 'react';

import { scoreAccount, type QualityResult } from '@/domain/quality';
import type { AccountInput } from '@/domain/repositories/account-repository';

export const EMPTY_ACCOUNT: AccountInput = {
  accountNumber: '',
  nameLegal: '',
};

export interface AccountFormState {
  form: AccountInput;
  set: (patch: Partial<AccountInput>) => void;
  valid: boolean;
  quality: QualityResult;
}

export function useAccountForm(initial: AccountInput): AccountFormState {
  const [form, setForm] = useState<AccountInput>(initial);
  const set = (patch: Partial<AccountInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const valid =
    (form.accountNumber ?? '').trim() !== '' &&
    (form.nameLegal ?? '').trim() !== '';
  return { form, set, valid, quality: scoreAccount(form) };
}
