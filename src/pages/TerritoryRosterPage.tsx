/**
 * Territory Roster: pick a territory + fiscal year, then staff each role seat
 * with exactly one member. This is the canonical place role → person is decided;
 * accounts inherit their team from the roster of the territory they sit in (see
 * the derived team on the Assignments page).
 *
 * Thin route container: the {@link useTerritoryRoster} view-model owns loading,
 * selection, and seat orchestration; the roster components render.
 */
import { PageHeader } from '@/components/shared';
import { RosterFilters } from '@/components/roster/RosterFilters';
import { RosterTable } from '@/components/roster/RosterTable';
import { useTerritoryRoster } from '@/usecase/roster/use-territory-roster';

export function TerritoryRosterPage() {
  const roster = useTerritoryRoster();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Territory Roster"
        subtitle="Staff one member per role in each territory. Accounts inherit their team from the territory they sit in."
      />

      <RosterFilters
        territories={roster.territories}
        fiscalYears={roster.fiscalYears}
        territoryId={roster.territoryId}
        fiscalYearId={roster.fiscalYearId}
        onTerritoryChange={roster.setTerritoryId}
        onFiscalYearChange={roster.setFiscalYearId}
      />

      <RosterTable
        territoryLabel={
          roster.territory ? `${roster.territory.territoryCode} role seats` : null
        }
        filledSeats={roster.filledSeats}
        totalRoles={roster.roles.length}
        territorySelected={!!roster.territoryId}
        loading={roster.loading}
        roles={roster.roles}
        seatFor={roster.seatFor}
        employeeById={roster.employeeById}
        activeEmployees={roster.activeEmployees}
        busyRole={roster.busyRole}
        onAssign={roster.assign}
        onAdvance={roster.advance}
      />
    </div>
  );
}
