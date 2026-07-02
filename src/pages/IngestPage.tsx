/**
 * Ingest: paste or upload a wide FY territory-assignment sheet, preview the
 * staging → canonical plan (alias matching, territory validation, placeholder
 * handling), then commit it to accounts + draft assignments + data-quality
 * issues. Thin container — all orchestration lives in `useIngest`.
 */
import { PageHeader } from '@/components/shared';
import { IngestHeaderActions } from '@/components/ingest/IngestHeaderActions';
import { IngestInputCard } from '@/components/ingest/IngestInputCard';
import { IngestIssuesCard } from '@/components/ingest/IngestIssuesCard';
import { IngestPreviewStats } from '@/components/ingest/IngestPreviewStats';
import { IngestSummaryCard } from '@/components/ingest/IngestSummaryCard';
import { ResolvedAssignmentsCard } from '@/components/ingest/ResolvedAssignmentsCard';
import { useIngest } from '@/usecase/ingest/use-ingest';

export function IngestPage() {
  const {
    text,
    reset,
    loadSample,
    handleFile,
    preview,
    summary,
    busy,
    onPreview,
    onCommit,
  } = useIngest();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ingest"
        subtitle="Load a wide FY assignment sheet → staging → canonical, with alias name-matching and data-quality checks."
        actions={
          <IngestHeaderActions onLoadSample={loadSample} onFile={handleFile} />
        }
      />

      <IngestInputCard
        text={text}
        onTextChange={reset}
        onPreview={onPreview}
        onCommit={onCommit}
        busy={busy}
        canCommit={preview !== null}
      />

      {summary && <IngestSummaryCard summary={summary} />}

      {preview && (
        <>
          <IngestPreviewStats stats={preview.plan.stats} />
          <ResolvedAssignmentsCard
            intents={preview.plan.intents}
            fiscalYearCode={preview.fiscalYear?.code}
          />
          <IngestIssuesCard issues={preview.plan.issues} />
        </>
      )}
    </div>
  );
}
