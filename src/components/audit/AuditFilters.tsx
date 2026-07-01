/** Presentational filter bar for the Audit Log: search + domain + action. */
import { Input, Select } from '@/components/shared';
import {
  AUDIT_DOMAIN_LABELS,
  type AuditActionFilter,
  type AuditDomainFilter,
} from '@/usecase/audit/selectors';
import {
  AUDIT_ACTION_META,
  type AuditAction,
  type AuditDomain,
} from '@/domain/types';

export function AuditFilters({
  search,
  onSearch,
  domainFilter,
  onDomainFilter,
  actionFilter,
  onActionFilter,
}: {
  search: string;
  onSearch: (value: string) => void;
  domainFilter: AuditDomainFilter;
  onDomainFilter: (value: AuditDomainFilter) => void;
  actionFilter: AuditActionFilter;
  onActionFilter: (value: AuditActionFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
      <div className="min-w-0 flex-1">
        <Input
          placeholder="Search summary, record, actor…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <Select
        className="w-40"
        value={domainFilter}
        onChange={(e) => onDomainFilter(e.target.value as AuditDomainFilter)}
      >
        <option value="all">All domains</option>
        {(Object.keys(AUDIT_DOMAIN_LABELS) as AuditDomain[]).map((d) => (
          <option key={d} value={d}>
            {AUDIT_DOMAIN_LABELS[d]}
          </option>
        ))}
      </Select>
      <Select
        className="w-40"
        value={actionFilter}
        onChange={(e) => onActionFilter(e.target.value as AuditActionFilter)}
      >
        <option value="all">All actions</option>
        {(Object.keys(AUDIT_ACTION_META) as AuditAction[]).map((a) => (
          <option key={a} value={a}>
            {AUDIT_ACTION_META[a].label}
          </option>
        ))}
      </Select>
    </div>
  );
}
