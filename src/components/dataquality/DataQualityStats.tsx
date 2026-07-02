/** Data-quality summary stat cards: open count + per-severity open counts. */
import { StatCard } from '@/components/shared';
import type { SeverityCounts } from '@/usecase/dataquality/use-data-quality';

interface DataQualityStatsProps {
  openCount: number;
  severityCounts: SeverityCounts;
}

export function DataQualityStats({
  openCount,
  severityCounts,
}: DataQualityStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Open issues"
        value={openCount}
        tone={openCount > 0 ? 'amber' : 'green'}
        hint="Open + in-progress"
      />
      <StatCard
        label="Critical"
        value={severityCounts.critical}
        tone={severityCounts.critical > 0 ? 'red' : 'gray'}
      />
      <StatCard
        label="High"
        value={severityCounts.high}
        tone={severityCounts.high > 0 ? 'red' : 'gray'}
      />
      <StatCard
        label="Medium"
        value={severityCounts.medium}
        tone={severityCounts.medium > 0 ? 'amber' : 'gray'}
      />
    </div>
  );
}
