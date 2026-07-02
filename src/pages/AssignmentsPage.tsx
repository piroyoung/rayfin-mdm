/**
 * Assignments: pick an account + fiscal year, then view its territory placement
 * and the role coverage *derived* from that territory's roster, side by side
 * with the previous fiscal year so reassignments are obvious.
 *
 * Coverage is never stored per account: people are decided on the Territory
 * Roster, and accounts inherit the roster of the territory they sit in.
 *
 * Thin route container: the {@link useAccountAssignments} view-model owns
 * loading, selection, derivation, and the placement actions; the cards render.
 */
import { EmptyState, PageHeader, Spinner } from '@/components/shared';
import { AssignmentFilters } from '@/components/assignments/AssignmentFilters';
import { CoverageComparisonCard } from '@/components/assignments/CoverageComparisonCard';
import { DerivedTeamCard } from '@/components/assignments/DerivedTeamCard';
import { TerritoryPlacementCard } from '@/components/assignments/TerritoryPlacementCard';
import { useAccountAssignments } from '@/usecase/assignments/use-account-assignments';

export function AssignmentsPage() {
  const vm = useAccountAssignments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        subtitle="Account coverage by role and fiscal year, derived from the territory roster. Compare this year's team with last year's."
      />

      <AssignmentFilters
        accounts={vm.accounts}
        fiscalYears={vm.fiscalYears}
        accountId={vm.accountId}
        fyId={vm.fyId}
        onAccountChange={vm.setAccountId}
        onFiscalYearChange={vm.setFyId}
      />

      {vm.refsLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Loading…" />
        </div>
      ) : !vm.accountId ? (
        <EmptyState
          title="Select an account"
          description="Choose an account and fiscal year to view its coverage."
        />
      ) : (
        <>
          <TerritoryPlacementCard
            placement={vm.territoryPlacement}
            territories={vm.territories}
            terrCode={vm.terrCode}
            fyId={vm.fyId}
            canRetire={vm.canRetirePlacement}
            busy={vm.placementBusy}
            onPlace={vm.placeInTerritory}
            onRetire={vm.retirePlacement}
          />

          <DerivedTeamCard
            loading={vm.assignmentsLoading}
            team={vm.derivedTeam}
            roleName={vm.roleName}
            empName={vm.empName}
            terrCode={vm.terrCode}
          />

          {vm.prevFiscalYear && (
            <CoverageComparisonCard
              prevFiscalYear={vm.prevFiscalYear}
              loading={vm.assignmentsLoading}
              rows={vm.comparison}
              roleName={vm.roleName}
              empName={vm.empName}
            />
          )}
        </>
      )}
    </div>
  );
}
