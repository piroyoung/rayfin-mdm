/**
 * Audit Log screen view-model. Reads the immutable trail through the injected
 * {@link AuditLog} port and owns the domain / action / search filter state.
 * All derivation is delegated to selectors; the page stays presentational.
 */
import { useMemo, useState } from 'react';

import { useDependencies } from '@/di/dependencies-context';
import { useAsyncData } from '@/usecase/shared/use-async-data';

import {
  filterAudit,
  type AuditActionFilter,
  type AuditDomainFilter,
} from './selectors';

export function useAudit() {
  const { audit } = useDependencies();
  const { data, loading, error } = useAsyncData(() => audit.list(), []);

  const [domainFilter, setDomainFilter] = useState<AuditDomainFilter>('all');
  const [actionFilter, setActionFilter] = useState<AuditActionFilter>('all');
  const [search, setSearch] = useState('');

  const events = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(
    () => filterAudit(events, domainFilter, actionFilter, search),
    [events, domainFilter, actionFilter, search]
  );

  return {
    loading,
    error,
    events,
    filtered,
    domainFilter,
    setDomainFilter,
    actionFilter,
    setActionFilter,
    search,
    setSearch,
  };
}
