/**
 * Dashboard "This is me" view-model. Loads the employee master through the
 * injected repository, resolves the signed-in user to their row with the pure
 * `matchEmployeeToUser` policy, and orchestrates the one obvious next action
 * (link the durable oid, or provision a new record) with busy state, toast, and
 * reload. The card stays presentational.
 */
import { useMemo, useState } from 'react';

import { useDependencies } from '@/di/dependencies-context';
import {
  matchEmployeeToUser,
  type IdentityMatch,
} from '@/domain/policies/employee-identity';
import type { AuthUser } from '@/domain/ports/auth-service';
import type { Employee } from '@/domain/types';
import { useAuth } from '@/usecase/auth/auth-context';
import {
  linkEmployeeToUser,
  provisionEmployeeFromUser,
} from '@/usecase/identity/identity-operations';
import { useAsyncData } from '@/usecase/shared/use-async-data';
import { useToast } from '@/usecase/shared/toast-context';

export interface MyIdentityView {
  user: AuthUser | null;
  match: IdentityMatch | null;
  loading: boolean;
  busy: boolean;
  onLink: (employee: Employee) => void;
  onProvision: () => void;
}

export function useMyIdentity(): MyIdentityView {
  const { user } = useAuth();
  const { employees, audit } = useDependencies();
  const toast = useToast();
  const { data, loading, reload } = useAsyncData(() => employees.list(), []);
  const [busy, setBusy] = useState(false);

  const match = useMemo(
    () => (user && data ? matchEmployeeToUser(user, data) : null),
    [user, data]
  );

  async function run(action: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await action();
      toast(ok, 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function onLink(employee: Employee) {
    if (!user) return;
    void run(
      () => linkEmployeeToUser({ employees, audit }, employee, user),
      'Linked to your employee record.'
    );
  }

  function onProvision() {
    if (!user) return;
    void run(
      () => provisionEmployeeFromUser({ employees, audit }, user),
      'Created your employee record.'
    );
  }

  return { user, match, loading, busy, onLink, onProvision };
}
