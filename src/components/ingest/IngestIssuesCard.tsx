/**
 * Data-quality issues preview Card: the list of issues the plan will raise on
 * commit, with severity badge and labelled issue type. Purely presentational.
 */
import { Badge, Card, EmptyState } from '@/components/shared';
import type { IngestIssue } from '@/domain/ingestPlan';
import {
  ISSUE_TYPE_META,
  SEVERITY_META,
  labelledMeta,
  tonedMeta,
} from '@/domain/types';

interface IngestIssuesCardProps {
  issues: IngestIssue[];
}

export function IngestIssuesCard({ issues }: IngestIssuesCardProps) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-gray-700">
        Data-quality issues
        <span className="ml-2 text-xs font-normal text-gray-500">
          raised on commit
        </span>
      </p>
      {issues.length === 0 ? (
        <EmptyState
          title="No issues found"
          description="Every row resolved cleanly."
        />
      ) : (
        <ul className="mt-3 space-y-1.5">
          {issues.map((issue, idx) => {
            const sev = tonedMeta(SEVERITY_META, issue.severity);
            return (
              <li
                key={`${issue.sourceRecordId}-${issue.issueType}-${idx}`}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
              >
                <Badge tone={sev.tone}>{sev.label}</Badge>
                <span className="font-medium text-gray-800">
                  {labelledMeta(ISSUE_TYPE_META, issue.issueType).label}
                </span>
                <span className="text-gray-600">{issue.description}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
