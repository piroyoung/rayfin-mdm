/**
 * Post-commit summary Card: six StatCards for what the ingest wrote, plus an
 * idempotency note when a re-run wrote nothing. Purely presentational.
 */
import { Card, StatCard } from '@/components/shared';
import type { IngestSummary } from '@/usecase/ingest/ingest-pipeline';

interface IngestSummaryCardProps {
  summary: IngestSummary;
}

export function IngestSummaryCard({ summary }: IngestSummaryCardProps) {
  const wroteNothing =
    summary.assignmentsCreated === 0 &&
    summary.placementsCreated === 0 &&
    summary.accountsCreated === 0;

  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-gray-700">Ingest complete</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Accounts created"
          value={summary.accountsCreated}
          tone="blue"
        />
        <StatCard
          label="Placements created"
          value={summary.placementsCreated}
          tone="purple"
        />
        <StatCard
          label="Role seats created"
          value={summary.assignmentsCreated}
          tone="green"
        />
        <StatCard
          label="Role seats skipped"
          value={summary.assignmentsSkipped}
          tone="slate"
        />
        <StatCard
          label="Issues raised"
          value={summary.issuesRaised}
          tone="amber"
        />
        <StatCard
          label="Fiscal year"
          value={summary.fiscalYearCode ?? '—'}
          tone="indigo"
        />
      </div>
      {wroteNothing && (
        <p className="mt-3 text-xs text-gray-500">
          Nothing new was written — this sheet was already ingested (the importer
          is idempotent).
        </p>
      )}
    </Card>
  );
}
