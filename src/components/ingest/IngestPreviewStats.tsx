/**
 * Preview stat strip: six StatCards summarising the resolved plan (accounts,
 * assignees, match/unknown/ambiguous counts, placeholders). Purely presentational.
 */
import { StatCard } from '@/components/shared';
import type { IngestStats } from '@/domain/ingestPlan';

interface IngestPreviewStatsProps {
  stats: IngestStats;
}

export function IngestPreviewStats({ stats }: IngestPreviewStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard
        label="Accounts"
        value={stats.accounts}
        hint={`${stats.newAccounts} new`}
        tone="blue"
      />
      <StatCard label="Assignees" value={stats.assignees} tone="indigo" />
      <StatCard label="Matched" value={stats.matched} tone="green" />
      <StatCard
        label="Unknown"
        value={stats.unknown}
        tone={stats.unknown ? 'red' : 'gray'}
      />
      <StatCard
        label="Ambiguous"
        value={stats.ambiguous}
        tone={stats.ambiguous ? 'amber' : 'gray'}
      />
      <StatCard
        label="Placeholders"
        value={stats.placeholders}
        hint={`${stats.invalidTerritories} bad territory`}
        tone={stats.placeholders ? 'amber' : 'gray'}
      />
    </div>
  );
}
