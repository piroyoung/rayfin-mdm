/** Audit Log: thin route container for the immutable master-data trail. */
import { Card, EmptyState, PageHeader, Spinner } from '@/components/shared';
import { AuditFilters } from '@/components/audit/AuditFilters';
import { AuditTable } from '@/components/audit/AuditTable';
import { useAudit } from '@/usecase/audit/use-audit';

export function AuditPage() {
  const {
    loading,
    error,
    events,
    filtered,
    domainFilter,
    setDomainFilter,
    actionFilter,
    setActionFilter,
    search,
    setSearch,
  } = useAudit();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Immutable record of every create, update, approval and merge."
      />

      <Card>
        <AuditFilters
          search={search}
          onSearch={setSearch}
          domainFilter={domainFilter}
          onDomainFilter={setDomainFilter}
          actionFilter={actionFilter}
          onActionFilter={setActionFilter}
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" label="Loading audit log…" />
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load audit log" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No audit events"
            description={
              events.length === 0
                ? 'Activity will appear here as you manage master data.'
                : 'No events match your filters.'
            }
          />
        ) : (
          <AuditTable events={filtered} />
        )}
      </Card>
    </div>
  );
}
