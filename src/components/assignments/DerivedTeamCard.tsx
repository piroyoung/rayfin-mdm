/**
 * Derived-team card: the role coverage for an account, read from the roster of
 * the territory it sits in. Presentational — the derived rows and the id→label
 * lookups come from the view-model; nothing is computed from the client here.
 */
import type { DerivedAccountRole } from '@/domain/territoryRoster';
import { Badge, Card, EmptyState, Spinner } from '@/components/shared';

interface DerivedTeamCardProps {
  loading: boolean;
  team: DerivedAccountRole[];
  roleName: (code: string) => string;
  empName: (id: string) => string;
  terrCode: (id?: string) => string;
}

export function DerivedTeamCard({
  loading,
  team,
  roleName,
  empName,
  terrCode,
}: DerivedTeamCardProps) {
  return (
    <Card>
      <div className="border-b border-gray-100 p-4">
        <p className="text-sm font-medium text-gray-700">
          Team — derived from territory roster
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Who covers this account per role, read from the roster of the
          account&apos;s territory. Staff seats on the Territory Roster page.
        </p>
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Deriving team…" />
        </div>
      ) : team.length === 0 ? (
        <EmptyState
          title="No derived coverage"
          description="Place this account in a territory and staff that territory's roster to see coverage here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Territory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {team.map((row) => (
                <tr key={row.roleTypeCode} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {roleName(row.roleTypeCode)}
                    </span>
                    <span className="ml-1 text-xs text-gray-400">
                      {row.roleTypeCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {empName(row.employeeId)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="blue">{terrCode(row.territoryId)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
