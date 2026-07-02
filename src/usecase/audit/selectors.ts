/** Pure derivations + display metadata for the Audit Log screen. */
import type { AuditAction, AuditDomain, AuditEvent } from '@/domain/types';

/** Human labels for each audited domain (drives the filter + the Domain column). */
export const AUDIT_DOMAIN_LABELS: Record<AuditDomain, string> = {
  account: 'Account',
  reference: 'Reference',
  change_request: 'Change request',
  employee: 'Employee',
  territory: 'Territory',
  territory_role: 'Territory role seat',
  fiscal_year: 'Fiscal year',
  role: 'Role',
  assignment: 'Assignment',
  source_xref: 'Source xref',
  data_quality: 'Data quality',
};

export type AuditDomainFilter = AuditDomain | 'all';
export type AuditActionFilter = AuditAction | 'all';

/** Filter audit events by domain, action, and free-text search. */
export function filterAudit(
  events: AuditEvent[],
  domainFilter: AuditDomainFilter,
  actionFilter: AuditActionFilter,
  search: string
): AuditEvent[] {
  const q = search.trim().toLowerCase();
  return events.filter((e) => {
    if (domainFilter !== 'all' && e.domain !== domainFilter) return false;
    if (actionFilter !== 'all' && e.action !== actionFilter) return false;
    if (!q) return true;
    return [e.summary, e.recordLabel, e.actor]
      .filter(Boolean)
      .some((v) => v!.toLowerCase().includes(q));
  });
}
