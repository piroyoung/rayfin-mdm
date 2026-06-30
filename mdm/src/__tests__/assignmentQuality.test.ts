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
  AccountEmployeeAssignment,
  AccountTerritoryAssignment,
  Customer,
  DataQualityIssue,
  Employee,
  Territory,
} from '@/domain/types';

const NOW = new Date('2026-01-01T00:00:00Z');

const account = (over: Partial<Customer> & { id: string }): Customer =>
  ({
    customerCode: `C-${over.id}`,
    name: `Account ${over.id}`,
    segment: 'enterprise',
    status: 'approved',
    isGolden: false,
    msSalesAccountId: 'MS-1',
    crmAccountId: 'CRM-1',
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  }) as Customer;

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

const empAssign = (
  over: Partial<AccountEmployeeAssignment> & { id: string }
): AccountEmployeeAssignment =>
  ({
    accountId: 'A1',
    employeeId: 'E1',
    fiscalYearId: 'FY26',
    roleTypeCode: 'AE',
    isPrimary: true,
    assignmentStatus: 'active',
    startDate: NOW,
    currentFlag: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  }) as AccountEmployeeAssignment;

const terrAssign = (
  over: Partial<AccountTerritoryAssignment> & { id: string }
): AccountTerritoryAssignment =>
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
  }) as AccountTerritoryAssignment;

const empty: QualitySnapshot = {
  accounts: [],
  employees: [],
  territories: [],
  employeeAssignments: [],
  territoryAssignments: [],
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
        account({ id: 'A1', taxId: 'JP-999' }),
        account({ id: 'A2', taxId: 'JP-999' }),
      ],
    });
    const dups = findings.filter((f) => f.issueType === 'DUPLICATE_ACCOUNT');
    expect(dups.map((f) => f.entityId).sort()).toEqual(['A1', 'A2']);
    expect(dups.every((f) => f.severity === 'high')).toBe(true);
  });
});

describe('evaluateAssignmentQuality — employee-assignment rules', () => {
  it('flags assignments to unknown and inactive employees', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      accounts: [account({ id: 'A1' })],
      employees: [employee({ id: 'E-inactive', isActive: false })],
      employeeAssignments: [
        empAssign({ id: 'X1', employeeId: 'E-missing' }),
        empAssign({ id: 'X2', employeeId: 'E-inactive', isPrimary: false }),
      ],
    });
    expect(typesOf(findings)).toContain('UNKNOWN_EMPLOYEE');
    expect(typesOf(findings)).toContain('INACTIVE_EMPLOYEE_ASSIGNED');
  });

  it('ignores non-current assignment rows', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      accounts: [account({ id: 'A1' })],
      employeeAssignments: [
        empAssign({ id: 'X1', employeeId: 'E-missing', currentFlag: false }),
      ],
    });
    expect(findings).toEqual([]);
  });

  it('flags an assignment pointing at a non-existent territory', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      accounts: [account({ id: 'A1' })],
      employees: [employee({ id: 'E1' })],
      employeeAssignments: [empAssign({ id: 'X1', territoryId: 'T-gone' })],
    });
    expect(typesOf(findings)).toContain('INVALID_TERRITORY');
  });
});

describe('evaluateAssignmentQuality — primary-owner rules', () => {
  it('flags MULTIPLE_PRIMARY_OWNER when a scope has two primaries', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      accounts: [account({ id: 'A1' })],
      employees: [employee({ id: 'E1' }), employee({ id: 'E2' })],
      employeeAssignments: [
        empAssign({ id: 'X1', employeeId: 'E1', isPrimary: true }),
        empAssign({ id: 'X2', employeeId: 'E2', isPrimary: true }),
      ],
    });
    const dup = findings.filter((f) => f.issueType === 'MULTIPLE_PRIMARY_OWNER');
    expect(dup).toHaveLength(1);
    expect(dup[0].entityId).toBe('A1');
  });

  it('flags MISSING_PRIMARY_OWNER when a scope has rows but no primary', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      accounts: [account({ id: 'A1' })],
      employees: [employee({ id: 'E1' })],
      employeeAssignments: [empAssign({ id: 'X1', isPrimary: false })],
    });
    expect(typesOf(findings)).toContain('MISSING_PRIMARY_OWNER');
  });

  it('does not flag a scope that already has a single primary', () => {
    const findings = evaluateAssignmentQuality({
      ...empty,
      accounts: [account({ id: 'A1' })],
      employees: [employee({ id: 'E1' })],
      employeeAssignments: [empAssign({ id: 'X1', isPrimary: true })],
    });
    expect(typesOf(findings)).not.toContain('MISSING_PRIMARY_OWNER');
    expect(typesOf(findings)).not.toContain('MULTIPLE_PRIMARY_OWNER');
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
