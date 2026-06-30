/**
 * Unit tests for the pure territory-roster derivation helpers. No Rayfin client
 * is touched — every function under test is a pure transform.
 */
import { describe, expect, it } from 'vitest';
import {
  territoryRoleScopeKey,
  findMultipleSeatMembers,
  currentTerritoryIdsForAccount,
  deriveAccountTeam,
  planSeatReassignment,
  type DeriveAccountTeamArgs,
} from '@/domain/territoryRoster';

const link = (
  over: Partial<DeriveAccountTeamArgs['territoryAssignments'][number]> & {
    territoryId: string;
  }
) => ({
  accountId: 'A1',
  fiscalYearId: 'FY26',
  currentFlag: true,
  ...over,
});

const seat = (
  over: Partial<DeriveAccountTeamArgs['territoryRoleAssignments'][number]> & {
    id: string;
  }
) => ({
  territoryId: 'T1',
  roleTypeCode: 'AE',
  fiscalYearId: 'FY26',
  employeeId: 'E-terr',
  currentFlag: true,
  ...over,
});

const override = (
  over: Partial<DeriveAccountTeamArgs['employeeAssignments'][number]> & {
    id: string;
  }
) => ({
  accountId: 'A1',
  roleTypeCode: 'AE',
  fiscalYearId: 'FY26',
  employeeId: 'E-override',
  isPrimary: true,
  currentFlag: true,
  ...over,
});

describe('territoryRoleScopeKey', () => {
  it('keys by territory + role + fiscal year', () => {
    expect(
      territoryRoleScopeKey({
        territoryId: 'T1',
        roleTypeCode: 'AE',
        fiscalYearId: 'FY26',
      })
    ).toBe('T1|AE|FY26');
  });
});

describe('findMultipleSeatMembers', () => {
  it('returns groups with more than one current member per seat', () => {
    const groups = findMultipleSeatMembers([
      seat({ id: 'S1', employeeId: 'E1' }),
      seat({ id: 'S2', employeeId: 'E2' }),
      seat({ id: 'S3', roleTypeCode: 'CSAM', employeeId: 'E3' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('T1|AE|FY26');
    expect(groups[0].rows.map((r) => r.id).sort()).toEqual(['S1', 'S2']);
  });

  it('ignores non-current rows when detecting clashes', () => {
    const groups = findMultipleSeatMembers([
      seat({ id: 'S1', employeeId: 'E1' }),
      seat({ id: 'S2', employeeId: 'E2', currentFlag: false }),
    ]);
    expect(groups).toEqual([]);
  });
});

describe('currentTerritoryIdsForAccount', () => {
  it('returns distinct current territories for the account + FY', () => {
    const ids = currentTerritoryIdsForAccount('A1', 'FY26', [
      link({ territoryId: 'T1' }),
      link({ territoryId: 'T1' }), // duplicate collapses
      link({ territoryId: 'T2' }),
      link({ territoryId: 'T3', currentFlag: false }), // not current
      link({ territoryId: 'T4', fiscalYearId: 'FY25' }), // other FY
      link({ territoryId: 'T5', accountId: 'A2' }), // other account
    ]);
    expect(ids.sort()).toEqual(['T1', 'T2']);
  });
});

describe('deriveAccountTeam', () => {
  const base: DeriveAccountTeamArgs = {
    accountId: 'A1',
    fiscalYearId: 'FY26',
    territoryAssignments: [link({ territoryId: 'T1' })],
    territoryRoleAssignments: [
      seat({ id: 'S-ae', roleTypeCode: 'AE', employeeId: 'E-ae' }),
      seat({ id: 'S-csam', roleTypeCode: 'CSAM', employeeId: 'E-csam' }),
    ],
    employeeAssignments: [],
  };

  it('derives the team straight from the territory roster when no overrides', () => {
    const team = deriveAccountTeam(base);
    expect(team.map((r) => [r.roleTypeCode, r.employeeId, r.source])).toEqual([
      ['AE', 'E-ae', 'territory'],
      ['CSAM', 'E-csam', 'territory'],
    ]);
    expect(team[0].territoryId).toBe('T1');
  });

  it('lets a per-account override win over the territory seat for that role', () => {
    const team = deriveAccountTeam({
      ...base,
      employeeAssignments: [
        override({ id: 'O1', roleTypeCode: 'CSAM', employeeId: 'E-special' }),
      ],
    });
    const csam = team.find((r) => r.roleTypeCode === 'CSAM')!;
    expect(csam.employeeId).toBe('E-special');
    expect(csam.source).toBe('override');
    // AE still comes from the territory.
    expect(team.find((r) => r.roleTypeCode === 'AE')!.source).toBe('territory');
  });

  it('adds override-only roles the territory does not staff', () => {
    const team = deriveAccountTeam({
      ...base,
      employeeAssignments: [
        override({ id: 'O1', roleTypeCode: 'SE', employeeId: 'E-se' }),
      ],
    });
    expect(team.map((r) => r.roleTypeCode)).toEqual(['AE', 'CSAM', 'SE']);
    expect(team.find((r) => r.roleTypeCode === 'SE')!.source).toBe('override');
  });

  it('prefers a primary override when several exist for one role', () => {
    const team = deriveAccountTeam({
      ...base,
      employeeAssignments: [
        override({ id: 'O1', employeeId: 'E-secondary', isPrimary: false }),
        override({ id: 'O2', employeeId: 'E-primary', isPrimary: true }),
      ],
    });
    expect(team.find((r) => r.roleTypeCode === 'AE')!.employeeId).toBe('E-primary');
  });

  it('returns nothing when the account is in no territory and has no override', () => {
    expect(
      deriveAccountTeam({ ...base, territoryAssignments: [] })
    ).toEqual([]);
  });

  it('ignores roster seats from territories the account is not in', () => {
    const team = deriveAccountTeam({
      ...base,
      territoryRoleAssignments: [
        seat({ id: 'S-x', territoryId: 'T-other', employeeId: 'E-other' }),
      ],
    });
    expect(team).toEqual([]);
  });
});

describe('planSeatReassignment', () => {
  it('retires the current row and opens a fresh current row, keeping scope', () => {
    const at = new Date('2026-02-01T00:00:00Z');
    const plan = planSeatReassignment(
      { id: 'S1', territoryId: 'T1', roleTypeCode: 'AE', fiscalYearId: 'FY26' },
      'E-new',
      at
    );
    expect(plan.retireId).toBe('S1');
    expect(plan.retirePatch).toEqual({
      currentFlag: false,
      endDate: at,
      assignmentStatus: 'retired',
    });
    expect(plan.newRow).toEqual({
      territoryId: 'T1',
      employeeId: 'E-new',
      fiscalYearId: 'FY26',
      roleTypeCode: 'AE',
      startDate: at,
    });
  });
});
