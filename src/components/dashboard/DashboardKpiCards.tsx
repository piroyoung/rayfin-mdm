/**
 * Dashboard KPI strip: master record count, golden records, average data
 * quality, and open change requests. Purely presentational.
 */
import { StatCard } from '@/components/shared';
import type { BadgeTone } from '@/domain/types';
import type { DashboardStats } from '@/usecase/dashboard/selectors';

interface DashboardKpiCardsProps {
  stats: DashboardStats;
  avgQualityTone: BadgeTone;
}

export function DashboardKpiCards({
  stats,
  avgQualityTone,
}: DashboardKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Master records"
        value={stats.totalRecords}
        hint={`${stats.accountCount} accounts`}
      />
      <StatCard
        label="Golden records"
        value={stats.goldenAccounts}
        tone="green"
        hint="Approved single source of truth"
      />
      <StatCard
        label="Avg. data quality"
        value={`${stats.avgQuality}%`}
        tone={avgQualityTone}
        hint="Across active records"
      />
      <StatCard
        label="Open change requests"
        value={stats.openCrs}
        tone={stats.openCrs > 0 ? 'amber' : 'gray'}
        hint={`${stats.pending} records pending`}
      />
    </div>
  );
}
