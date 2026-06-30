/** Dashboard: cross-domain KPIs, quality, stewardship and recent activity. */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { listCustomers } from '@/services/customers';
import { listProducts } from '@/services/products';
import { listChangeRequests } from '@/services/stewardship';
import { listAudit } from '@/services/audit';
import { listOpenDataQualityIssues } from '@/services/dataQuality';
import { ensureSeedData } from '@/services/seed';
import {
  findCustomerDuplicates,
  findProductDuplicates,
} from '@/domain/duplicates';
import {
  AUDIT_ACTION_META,
  isActiveStatus,
  MASTER_DOMAIN_META,
  tonedMeta,
  type AuditEvent,
  type ChangeRequest,
  type Customer,
  type DataQualityIssue,
  type Product,
} from '@/domain/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { fmtRelative } from '@/lib/format';
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  Spinner,
  StatCard,
} from '@/components/ui';

interface DashboardData {
  customers: Customer[];
  products: Product[];
  changeRequests: ChangeRequest[];
  audit: AuditEvent[];
  openIssues: DataQualityIssue[];
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function DashboardPage() {
  const { data, loading, error } = useAsyncData<DashboardData>(async () => {
    await ensureSeedData();
    const [customers, products, changeRequests, audit, openIssues] =
      await Promise.all([
        listCustomers(),
        listProducts(),
        listChangeRequests(),
        listAudit(),
        listOpenDataQualityIssues(),
      ]);
    return { customers, products, changeRequests, audit, openIssues };
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const { customers, products, changeRequests } = data;
    const activeCustomers = customers.filter((c) => isActiveStatus(c.status));
    const activeProducts = products.filter((p) => isActiveStatus(p.status));
    const goldenCustomers = customers.filter((c) => c.isGolden).length;
    const goldenProducts = products.filter((p) => p.isGolden).length;
    const pending =
      customers.filter((c) => c.status === 'pending_approval').length +
      products.filter((p) => p.status === 'pending_approval').length;
    const openCrs = changeRequests.filter((c) => c.status === 'open').length;
    const dupGroups =
      findCustomerDuplicates(customers).length +
      findProductDuplicates(products).length;
    const openIssues = data.openIssues.length;
    const criticalIssues = data.openIssues.filter(
      (i) => i.severity === 'critical' || i.severity === 'high'
    ).length;
    const qualityScores = [
      ...activeCustomers.map((c) => c.qualityScore ?? 0),
      ...activeProducts.map((p) => p.qualityScore ?? 0),
    ];
    return {
      totalRecords: activeCustomers.length + activeProducts.length,
      customerCount: activeCustomers.length,
      productCount: activeProducts.length,
      goldenCustomers,
      goldenProducts,
      pending,
      openCrs,
      dupGroups,
      openIssues,
      criticalIssues,
      avgQuality: avg(qualityScores),
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" label="Loading master data…" />
      </div>
    );
  }

  if (error || !data || !stats) {
    return (
      <Card>
        <EmptyState
          title="Couldn't load the dashboard"
          description={error ?? 'Unexpected error.'}
        />
      </Card>
    );
  }

  const qualityTone =
    stats.avgQuality >= 80 ? 'green' : stats.avgQuality >= 50 ? 'amber' : 'red';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data Overview"
        subtitle="Golden records, data quality and stewardship across your domains."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Master records"
          value={stats.totalRecords}
          hint={`${stats.customerCount} customers · ${stats.productCount} products`}
        />
        <StatCard
          label="Golden records"
          value={stats.goldenCustomers + stats.goldenProducts}
          tone="green"
          hint="Approved single source of truth"
        />
        <StatCard
          label="Avg. data quality"
          value={`${stats.avgQuality}%`}
          tone={qualityTone}
          hint="Across active records"
        />
        <StatCard
          label="Open change requests"
          value={stats.openCrs}
          tone={stats.openCrs > 0 ? 'amber' : 'gray'}
          hint={`${stats.pending} records pending`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quality + dedup */}
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
              <ProgressBar value={stats.avgQuality} tone={qualityTone} />
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
                {stats.criticalIssues > 0
                  ? ` · ${stats.criticalIssues} high+`
                  : ''}
              </Badge>
            </div>
            <div className="flex gap-3 pt-1 text-sm">
              <Link
                to="/customers"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Review customers →
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

        {/* Recent activity */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Recent activity
            </h2>
            <Link
              to="/audit"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              View audit log →
            </Link>
          </div>
          {data.audit.length === 0 ? (
            <p className="mt-6 text-center text-sm text-gray-500">
              No activity recorded yet.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {data.audit.slice(0, 7).map((event) => (
                <li
                  key={event.id}
                  className="flex items-center gap-3 py-2.5 text-sm"
                >
                  <Badge tone={tonedMeta(AUDIT_ACTION_META, event.action).tone}>
                    {tonedMeta(AUDIT_ACTION_META, event.action).label}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-gray-700">
                    {event.summary ?? event.recordLabel ?? '—'}
                  </span>
                  <span className="hidden shrink-0 text-xs text-gray-400 sm:block">
                    {MASTER_DOMAIN_META[
                      event.domain as keyof typeof MASTER_DOMAIN_META
                    ]?.label ?? event.domain}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {fmtRelative(event.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
