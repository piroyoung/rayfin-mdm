/**
 * Dashboard: cross-domain KPIs, data quality, stewardship and recent activity.
 * Thin container — all loading and derivation lives in `useDashboard`.
 */
import { DashboardKpiCards } from '@/components/dashboard/DashboardKpiCards';
import { DataHealthCard } from '@/components/dashboard/DataHealthCard';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import { MyIdentityCard } from '@/components/MyIdentityCard';
import { Card, EmptyState, PageHeader, Spinner } from '@/components/shared';
import { useDashboard } from '@/usecase/dashboard/use-dashboard';

export function DashboardPage() {
  const { loading, error, stats, avgQualityTone, recentActivity } =
    useDashboard();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" label="Loading master data…" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <EmptyState
          title="Couldn't load the dashboard"
          description={error ?? 'Unexpected error.'}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data Overview"
        subtitle="Golden records, data quality and stewardship across your domains."
      />

      <MyIdentityCard />

      <DashboardKpiCards stats={stats} avgQualityTone={avgQualityTone} />

      <div className="grid gap-6 lg:grid-cols-3">
        <DataHealthCard stats={stats} avgQualityTone={avgQualityTone} />
        <RecentActivityCard events={recentActivity} />
      </div>
    </div>
  );
}
