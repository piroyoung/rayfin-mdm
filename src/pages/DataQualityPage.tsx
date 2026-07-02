/** Data quality: run assignment checks, triage the issue queue, resolve/dismiss. */
import { DataQualityFilters } from '@/components/dataquality/DataQualityFilters';
import { DataQualityStats } from '@/components/dataquality/DataQualityStats';
import { DataQualityTable } from '@/components/dataquality/DataQualityTable';
import { IssueResolutionModal } from '@/components/dataquality/IssueResolutionModal';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  Tooltip,
} from '@/components/shared';
import { useDataQuality } from '@/usecase/dataquality/use-data-quality';

export function DataQualityPage() {
  const vm = useDataQuality();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Quality"
        subtitle="Automated assignment checks and the steward triage queue."
        actions={
          <Tooltip label="割り当てデータの品質チェックを実行します" side="bottom">
            <Button variant="primary" loading={vm.running} onClick={vm.runChecks}>
              Run checks
            </Button>
          </Tooltip>
        }
      />

      <DataQualityStats
        openCount={vm.openIssues.length}
        severityCounts={vm.severityCounts}
      />

      <Card>
        <DataQualityFilters
          statusFilter={vm.statusFilter}
          severityFilter={vm.severityFilter}
          onStatusChange={vm.setStatusFilter}
          onSeverityChange={vm.setSeverityFilter}
        />

        {vm.loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" label="Loading issues…" />
          </div>
        ) : vm.error ? (
          <EmptyState title="Couldn't load issues" description={vm.error} />
        ) : vm.filtered.length === 0 ? (
          <EmptyState
            title="No issues"
            description={
              vm.issues.length === 0
                ? 'Run the checks to populate the triage queue.'
                : 'Nothing matches the current filters.'
            }
          />
        ) : (
          <DataQualityTable
            issues={vm.filtered}
            busyId={vm.busyId}
            onStart={vm.start}
            onResolve={vm.askResolve}
            onDismiss={vm.askDismiss}
          />
        )}
      </Card>

      <IssueResolutionModal
        resolving={vm.resolving}
        comment={vm.comment}
        busy={vm.busyId === vm.resolving?.issue.id}
        onCommentChange={vm.setComment}
        onCancel={() => vm.setResolving(null)}
        onConfirm={vm.confirmResolution}
      />
    </div>
  );
}
