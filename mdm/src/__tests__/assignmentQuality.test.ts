/**
 * Unit tests for the pure assignment data-quality rule engine. No Rayfin client
 * is touched — `evaluateAssignmentQuality` / `newFindings` are pure.
 */
import { describe, expect, it } from 'vitest';
import {
  evaluateAssignmentQuality,
  newFindings,
  findingKey,
  type QualityFinding,
  type QualitySnapshot,
} from '@/domain/assignmentQuality';
import type {
  TerritoryAccountAssignment,
  Account,
  DataQualityIssue,
  Employee,
  Territory,
  TerritoryRoleAssignment,
} from '@/domain/types';

const NOW = new Date('2026-01-01T00:00:00Z');

const account = (over: Partial<Account> & { id: string }): Account =>
  ({
    accountNumber: `C-${over.id}`,
    nameLegal: `Account ${over.id}`,
    segmentCode: 'enterprise',
    status: 'approved',
    isGolden: false,
    msSalesAccountId: 'MS-1',
    crmAccountId: 'CRM-1',
    isActive: true,
    validFrom: NOW,
    currentFlag: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  }) as Account;

const employee = (over: Partial<Employee> & { id: string }): Employee =>
  ({
    displayName: `Emp ${over.id}`,
    isActive: true,
    currentFlag: true,
    validFrom: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  }) as Employee;

const territory = (over: Partial<Territory> & { id: string }): Territory =>
  ({
    territoryCode: `T-${over.id}`,
    territoryName: `Terr ${over.id}`,
    isActive: true,
    currentFlag: true,
    validFrom: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  }) as Territory;

const terrAssign = (
  over: Partial<TerritoryAccountAssignment> & { id: string }
): TerritoryAccountAssignment =>
  ({
    accountId: 'A1',
    territoryId: 'T1',
    fiscalYearId: 'FY26',
    assignmentStatus: 'active',
    startDate: NOW,
    currentFlag: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  }) as TerritoryAccountAssignment;

const traSeat = (
  over: Partial<TerritoryRoleAssignment> & { id: string }
): TerritoryRoleAssignment =>
  ({
    territoryId: 'T1',
    employeeId: 'E1',
    fiscalYearId: 'FY26',
    roleTypeCode: 'AE',
    assignmentStatus: 'active',
    startDate: NOW,
    currentFlag: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  }) as TerritoryRoleAssignment;

const empty: QualitySnapshot = {
  accounts: [],
  employees: [],
  territories: [],
  territoryAssignments: [],
  territoryRoleAssignments: [],
};

const typesOf = (fs: QualityFinding[]) => fs.map((f) => f.issueType).sort();

describe('evaluateAssignmentQuality — account rules', () => {
  it('flags accounts missing both external ids, ignoring archived/merged', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      accounts: [
        account({ id: 'A1', msSalesAccountId: undefined, crmAccountId: undefined }),
        account({ id: 'A2', crmAccountId: undefined }), // still has MSSales id
        account({
          id: 'A3',
          status: 'merged',
          msSalesAccountId: undefined,
          crmAccountId: undefined,
        }),
      ],
    });
    const missing = findings.filter((f) => f.issueType === 'MISSING_ACCOUNT_ID');
    expect(missing.map((f) => f.entityId)).toEqual(['A1']);
  });

  it('raises a DUPLICATE_ACCOUNT issue for every record in a match group', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      accounts: [
        account({ id: 'A1', crmAccountId: 'JP-999' }),
        account({ id: 'A2', crmAccountId: 'JP-999' }),
      ],
    });
    const dups = findings.filter((f) => f.issueType === 'DUPLICATE_ACCOUNT');
    expect(dups.map((f) => f.entityId).sort()).toEqual(['A1', 'A2']);
    expect(dups.every((f) => f.severity === 'high')).toBe(true);
  });
});

describe('evaluateAssignmentQuality — territory + alias rules', () => {
  it('flags PARENT_CYCLE for territories in a parent loop', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      territories: [
        territory({ id: 'T1', parentTerritoryId: 'T2' }),
        territory({ id: 'T2', parentTerritoryId: 'T1' }),
      ],
    });
    const cyc = findings.filter((f) => f.issueType === 'PARENT_CYCLE');
    expect(cyc.map((f) => f.entityId).sort()).toEqual(['T1', 'T2']);
  });

  it('flags INVALID_TERRITORY for a territory placement with no territory', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      accounts: [account({ id: 'A1' })],
      territoryAssignments: [terrAssign({ id: 'P1', territoryId: 'T-gone' })],
    });
    expect(typesOf(findings)).toContain('INVALID_TERRITORY');
  });

  it('flags ALIAS_AMBIGUOUS when active employees share an alias', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      employees: [
        employee({ id: 'E1', alias: 'jdoe' }),
        employee({ id: 'E2', alias: 'JDOE' }),
        employee({ id: 'E3', alias: 'unique' }),
      ],
    });
    const amb = findings.filter((f) => f.issueType === 'ALIAS_AMBIGUOUS');
    expect(amb.map((f) => f.entityId).sort()).toEqual(['E1', 'E2']);
  });
});

describe('evaluateAssignmentQuality — territory-role seat rules', () => {
  it('flags MULTIPLE_TERRITORY_PER_ACCOUNT when an account sits in 2 territories', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      accounts: [account({ id: 'A1' })],
      territories: [territory({ id: 'T1' }), territory({ id: 'T2' })],
      territoryAssignments: [
        terrAssign({ id: 'P1', territoryId: 'T1' }),
        terrAssign({ id: 'P2', territoryId: 'T2' }),
      ],
    });
    const multi = findings.filter(
      (f) => f.issueType === 'MULTIPLE_TERRITORY_PER_ACCOUNT'
    );
    expect(multi).toHaveLength(1);
    expect(multi[0].entityId).toBe('A1');
  });

  it('does not flag an account placed in a single territory', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      accounts: [account({ id: 'A1' })],
      territories: [territory({ id: 'T1' })],
      territoryAssignments: [terrAssign({ id: 'P1', territoryId: 'T1' })],
    });
    expect(typesOf(findings)).not.toContain('MULTIPLE_TERRITORY_PER_ACCOUNT');
  });

  it('flags unknown / inactive / invalid-territory seats on the roster', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      territories: [territory({ id: 'T1' })],
      employees: [employee({ id: 'E-inactive', isActive: false })],
      territoryRoleAssignments: [
        traSeat({ id: 'S1', employeeId: 'E-missing' }),
        traSeat({ id: 'S2', roleTypeCode: 'CSAM', employeeId: 'E-inactive' }),
        traSeat({ id: 'S3', roleTypeCode: 'SE', territoryId: 'T-gone', employeeId: 'E-missing' }),
      ],
    });
    expect(typesOf(findings)).toContain('UNKNOWN_EMPLOYEE');
    expect(typesOf(findings)).toContain('INACTIVE_EMPLOYEE_ASSIGNED');
    expect(typesOf(findings)).toContain('INVALID_TERRITORY');
  });

  it('flags ROLE_MISMATCH when a seat holder is staffed off their home role', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      territories: [territory({ id: 'T1' })],
      employees: [employee({ id: 'E1', roleTypeCode: 'CSAM' })],
      territoryRoleAssignments: [
        traSeat({ id: 'S1', employeeId: 'E1', roleTypeCode: 'AE' }),
      ],
    });
    const mismatch = findings.filter((f) => f.issueType === 'ROLE_MISMATCH');
    expect(mismatch).toHaveLength(1);
    expect(mismatch[0].severity).toBe('low');
  });

  it('does not flag ROLE_MISMATCH when home role matches the seat', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      territories: [territory({ id: 'T1' })],
      employees: [employee({ id: 'E1', roleTypeCode: 'AE' })],
      territoryRoleAssignments: [
        traSeat({ id: 'S1', employeeId: 'E1', roleTypeCode: 'AE' }),
      ],
    });
    expect(typesOf(findings)).not.toContain('ROLE_MISMATCH');
  });

  it('flags MULTIPLE_TERRITORY_ROLE_MEMBER when one seat has two members', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      territories: [territory({ id: 'T1' })],
      employees: [employee({ id: 'E1' }), employee({ id: 'E2' })],
      territoryRoleAssignments: [
        traSeat({ id: 'S1', employeeId: 'E1' }),
        traSeat({ id: 'S2', employeeId: 'E2' }),
      ],
    });
    const dup = findings.filter(
      (f) => f.issueType === 'MULTIPLE_TERRITORY_ROLE_MEMBER'
    );
    expect(dup).toHaveLength(1);
  });

  it('ignores non-current seats entirely', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      territories: [territory({ id: 'T1' })],
      territoryRoleAssignments: [
        traSeat({ id: 'S1', employeeId: 'E-missing', currentFlag: false }),
      ],
    });
    expect(findings).toEqual([]);
  });
});

describe('newFindings', () => {
  const finding: QualityFinding = {
    entityType: 'account',
    entityId: 'A1',
    issueType: 'MISSING_ACCOUNT_ID',
    severity: 'medium',
    description: 'x',
  };

  it('suppresses a finding that already has an open issue', () => {
    const existing = [
      {
        entityType: 'account',
        entityId: 'A1',
        issueType: 'MISSING_ACCOUNT_ID',
        resolutionStatus: 'open',
      } as DataQualityIssue,
    ];
    expect(newFindings([finding], existing)).toEqual([]);
  });

  it('re-raises a finding whose prior issue was resolved or dismissed', () => {
    const existing = [
      {
        entityType: 'account',
        entityId: 'A1',
        issueType: 'MISSING_ACCOUNT_ID',
        resolutionStatus: 'resolved',
      } as DataQualityIssue,
    ];
    expect(newFindings([finding], existing)).toHaveLength(1);
  });

  it('dedupes identical findings within the same run', () => {
    expect(newFindings([finding, { ...finding }], [])).toHaveLength(1);
  });

  it('findingKey is stable across entity + rule', () => {
    expect(findingKey(finding)).toBe('account|A1|MISSING_ACCOUNT_ID');
  });
});
