/**
 * Dashboard derivation. Turns the loaded cross-domain records into the KPI /
 * data-health view model. Keeps the counting and averaging out of the page so
 * components stay presentational and the rule set is unit-testable.
 */
import { findAccountDuplicates } from '@/domain/duplicates';
import {
  isActiveStatus,
  type Account,
  type ChangeRequest,
  type DataQualityIssue,
} from '@/domain/types';

export interface DashboardStats {
  totalRecords: number;
  accountCount: number;
  goldenAccounts: number;
  pending: number;
  openCrs: number;
  dupGroups: number;
  openIssues: number;
  criticalIssues: number;
  avgQuality: number;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function computeDashboardStats(
  accounts: Account[],
  changeRequests: ChangeRequest[],
  openIssues: DataQualityIssue[]
): DashboardStats {
  const activeAccounts = accounts.filter((a) => isActiveStatus(a.status));
  const goldenAccounts = accounts.filter((a) => a.isGolden).length;
  const pending = accounts.filter(
    (a) => a.status === 'pending_approval'
  ).length;
  const openCrs = changeRequests.filter((c) => c.status === 'open').length;
  const dupGroups = findAccountDuplicates(accounts).length;
  const criticalIssues = openIssues.filter(
    (i) => i.severity === 'critical' || i.severity === 'high'
  ).length;
  const qualityScores = activeAccounts.map((a) => a.qualityScore ?? 0);
  return {
    totalRecords: activeAccounts.length,
    accountCount: activeAccounts.length,
    goldenAccounts,
    pending,
    openCrs,
    dupGroups,
    openIssues: openIssues.length,
    criticalIssues,
    avgQuality: avg(qualityScores),
  };
}
