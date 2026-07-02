/** Triage table for data-quality issues with per-row steward actions. */
import { resolutionActions } from '@/domain/dataQualityWorkflow';
import {
  ISSUE_TYPE_META,
  RESOLUTION_STATUS_META,
  SEVERITY_META,
  labelledMeta,
  tonedMeta,
  type DataQualityIssue,
} from '@/domain/types';
import { fmtRelative } from '@/lib/format';
import { Badge, Button } from '@/components/shared';

interface DataQualityTableProps {
  issues: DataQualityIssue[];
  busyId: string | null;
  onStart: (issue: DataQualityIssue) => void;
  onResolve: (issue: DataQualityIssue) => void;
  onDismiss: (issue: DataQualityIssue) => void;
}

export function DataQualityTable({
  issues,
  busyId,
  onStart,
  onResolve,
  onDismiss,
}: DataQualityTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
            <th className="px-4 py-3">Issue</th>
            <th className="px-4 py-3">Severity</th>
            <th className="px-4 py-3">Entity</th>
            <th className="px-4 py-3">Detected</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {issues.map((i) => {
            const actions = resolutionActions(i.resolutionStatus);
            return (
              <tr key={i.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">
                    {labelledMeta(ISSUE_TYPE_META, i.issueType).label}
                  </p>
                  {i.description && (
                    <p className="mt-0.5 max-w-md text-xs text-gray-500">
                      {i.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={tonedMeta(SEVERITY_META, i.severity).tone}>
                    {tonedMeta(SEVERITY_META, i.severity).label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {i.entityType}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {fmtRelative(i.detectedAt)}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    tone={
                      tonedMeta(RESOLUTION_STATUS_META, i.resolutionStatus).tone
                    }
                  >
                    {tonedMeta(RESOLUTION_STATUS_META, i.resolutionStatus).label}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {actions.canStart && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={busyId === i.id}
                        onClick={() => onStart(i)}
                      >
                        Start
                      </Button>
                    )}
                    {actions.canResolve && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onResolve(i)}
                      >
                        Resolve
                      </Button>
                    )}
                    {actions.canDismiss && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDismiss(i)}
                      >
                        Dismiss
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
