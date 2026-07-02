/** Status + severity filter controls for the data-quality triage queue. */
import { Select } from '@/components/shared';
import {
  SEVERITY_META,
  type IssueSeverity,
  type ResolutionStatus,
} from '@/domain/types';

const SEVERITIES: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];

interface DataQualityFiltersProps {
  statusFilter: ResolutionStatus | 'all';
  severityFilter: IssueSeverity | 'all';
  onStatusChange: (value: ResolutionStatus | 'all') => void;
  onSeverityChange: (value: IssueSeverity | 'all') => void;
}

export function DataQualityFilters({
  statusFilter,
  severityFilter,
  onStatusChange,
  onSeverityChange,
}: DataQualityFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
      <Select
        className="w-44"
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as ResolutionStatus | 'all')}
      >
        <option value="all">All statuses</option>
        <option value="open">Open</option>
        <option value="in_progress">In progress</option>
        <option value="resolved">Resolved</option>
        <option value="dismissed">Dismissed</option>
      </Select>
      <Select
        className="w-40"
        value={severityFilter}
        onChange={(e) => onSeverityChange(e.target.value as IssueSeverity | 'all')}
      >
        <option value="all">All severities</option>
        {SEVERITIES.map((s) => (
          <option key={s} value={s}>
            {SEVERITY_META[s].label}
          </option>
        ))}
      </Select>
    </div>
  );
}
