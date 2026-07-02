/**
 * Dashboard screen view-model. Ensures demo seed data exists, then loads the
 * cross-domain records (accounts, change requests, audit trail, open quality
 * issues) through injected ports and derives the KPI / data-health view model.
 * The page and its cards stay presentational.
 */
import { useMemo } from 'react';

import { qualityTone } from '@/domain/quality';
import type { AuditEvent, BadgeTone } from '@/domain/types';
import { useDependencies } from '@/di/dependencies-context';
import { useAsyncData } from '@/usecase/shared/use-async-data';

import { computeDashboardStats, type DashboardStats } from './selectors';

export function useDashboard(): {
  loading: boolean;
  error: string | null;
  stats: DashboardStats | null;
  avgQualityTone: BadgeTone;
  recentActivity: AuditEvent[];
} {
  const deps = useDependencies();

  const { data, loading, error } = useAsyncData(async () => {
    await deps.seed.ensure();
    const [accounts, changeRequests, audit, issues] = await Promise.all([
      deps.accounts.list(),
      deps.changeRequests.list(),
      deps.audit.list(),
      deps.dataQualityIssues.list(),
    ]);
    const openIssues = issues.filter(
      (i) =>
        i.resolutionStatus === 'open' || i.resolutionStatus === 'in_progress'
    );
    return { accounts, changeRequests, audit, openIssues };
  }, []);

  const stats = useMemo(
    () =>
      data
        ? computeDashboardStats(
            data.accounts,
            data.changeRequests,
            data.openIssues
          )
        : null,
    [data]
  );

  return {
    loading,
    error,
    stats,
    avgQualityTone: stats ? qualityTone(stats.avgQuality) : 'gray',
    recentActivity: data?.audit ?? [],
  };
}
