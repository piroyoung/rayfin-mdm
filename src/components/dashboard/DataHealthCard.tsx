/**
 * Data-health Card: overall quality bar, duplicate groups, records pending
 * approval, open data-quality issues, and quick links to the accounts and
 * data-quality screens. Purely presentational.
 */
import { Link } from 'react-router-dom';

import { Badge, Card, ProgressBar } from '@/components/shared';
import type { BadgeTone } from '@/domain/types';
import type { DashboardStats } from '@/usecase/dashboard/selectors';

interface DataHealthCardProps {
  stats: DashboardStats;
  avgQualityTone: BadgeTone;
}

export function DataHealthCard({ stats, avgQualityTone }: DataHealthCardProps) {
  return (
    <Card className="p-5 lg:col-span-1">
      <h2 className="text-sm font-semibold text-gray-900">Data health</h2>
      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-gray-600">Overall quality</span>
            <span className="font-medium text-gray-900">
              {stats.avgQuality}%
            </span>
          </div>
          <ProgressBar value={stats.avgQuality} tone={avgQualityTone} />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
          <span className="text-gray-600">Potential duplicate groups</span>
          <Badge tone={stats.dupGroups > 0 ? 'amber' : 'green'}>
            {stats.dupGroups}
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
          <span className="text-gray-600">Records pending approval</span>
          <Badge tone={stats.pending > 0 ? 'amber' : 'gray'}>
            {stats.pending}
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
          <span className="text-gray-600">Open data-quality issues</span>
          <Badge
            tone={
              stats.criticalIssues > 0
                ? 'red'
                : stats.openIssues > 0
                  ? 'amber'
                  : 'green'
            }
          >
            {stats.openIssues}
            {stats.criticalIssues > 0 ? ` · ${stats.criticalIssues} high+` : ''}
          </Badge>
        </div>
        <div className="flex gap-3 pt-1 text-sm">
          <Link
            to="/accounts"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Review accounts →
          </Link>
          <Link
            to="/data-quality"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Triage issues →
          </Link>
        </div>
      </div>
    </Card>
  );
}
