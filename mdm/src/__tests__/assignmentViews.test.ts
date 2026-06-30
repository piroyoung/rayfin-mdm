/** Unit tests for the pure derived assignment views + SCD2 reassignment plan. */
import { describe, expect, it } from 'vitest';
import {
  accountOwnerMatrix,
  currentRows,
  fyAssignmentChanges,
  planReassignment,
  publishedRows,
  scopesWithMultipleCurrent,
} from '@/domain/assignmentViews';
import type { AccountEmployeeAssignment } from '@/domain/types';

const NOW = new Date('2026-01-01T00:00:00Z');

const a = (
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

describe('current / published selectors', () => {
  it('currentRows keeps only currentFlag rows', () => {
    const rows = [a({ id: '1' }), a({ id: '2', currentFlag: false })];
    expect(currentRows(rows).map((r) => r.id)).toEqual(['1']);
  });

  it('publishedRows requires currentFlag AND approved/active', () => {
    const rows = [
      a({ id: 'ok', assignmentStatus: 'approved' }),
      a({ id: 'draft', assignmentStatus: 'draft' }),
      a({ id: 'submitted', assignmentStatus: 'submitted' }),
      a({ id: 'stale', assignmentStatus: 'active', currentFlag: false }),
    ];
    expect(publishedRows(rows).map((r) => r.id)).toEqual(['ok']);
  });
});

describe('accountOwnerMatrix', () => {
  it('groups by account/role/FY and surfaces the primary', () => {
    const rows = [
      a({ id: 'p', employeeId: 'E1', isPrimary: true }),
      a({ id: 's', employeeId: 'E2', isPrimary: false }),
    ];
    const cells = accountOwnerMatrix(rows);
    expect(cells).toHaveLength(1);
    expect(cells[0].members).toHaveLength(2);
    expect(cells[0].primary?.id).toBe('p');
  });

  it('publishedOnly excludes draft rows', () => {
    const rows = [
      a({ id: 'p', assignmentStatus: 'draft', isPrimary: true }),
      a({ id: 's', assignmentStatus: 'active', employeeId: 'E2', isPrimary: false }),
    ];
    const cells = accountOwnerMatrix(rows, { publishedOnly: true });
    expect(cells[0].members.map((m) => m.id)).toEqual(['s']);
    expect(cells[0].primary).toBeUndefined();
  });
});

describe('fyAssignmentChanges', () => {
  it('flags a changed primary owner across fiscal years', () => {
    const prev = [a({ id: 'p25', fiscalYearId: 'FY25', employeeId: 'E1' })];
    const cur = [a({ id: 'p26', fiscalYearId: 'FY26', employeeId: 'E9' })];
    const changes = fyAssignmentChanges(prev, cur);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      accountId: 'A1',
      roleTypeCode: 'AE',
      previousEmployeeId: 'E1',
      currentEmployeeId: 'E9',
      changed: true,
    });
  });

  it('marks unchanged when the same owner carries over', () => {
    const prev = [a({ id: 'p25', fiscalYearId: 'FY25', employeeId: 'E1' })];
    const cur = [a({ id: 'p26', fiscalYearId: 'FY26', employeeId: 'E1' })];
    expect(fyAssignmentChanges(prev, cur)[0].changed).toBe(false);
  });

  it('ignores non-published owners on either side', () => {
    const prev = [
      a({ id: 'p25', fiscalYearId: 'FY25', employeeId: 'E1', assignmentStatus: 'draft' }),
    ];
    const cur = [a({ id: 'p26', fiscalYearId: 'FY26', employeeId: 'E9' })];
    const change = fyAssignmentChanges(prev, cur)[0];
    expect(change.previousEmployeeId).toBeUndefined();
    expect(change.changed).toBe(true);
  });
});

describe('planReassignment (SCD2)', () => {
  it('end-dates the old row and opens a fresh current row, preserving history', () => {
    const current = a({ id: 'old', employeeId: 'E1', territoryId: 'T1' });
    const plan = planReassignment(current, 'E9', NOW);

    expect(plan.retireId).toBe('old');
    expect(plan.retirePatch).toEqual({
      currentFlag: false,
      endDate: NOW,
      assignmentStatus: 'retired',
    });
    expect(plan.newRow).toMatchObject({
      accountId: 'A1',
      employeeId: 'E9',
      roleTypeCode: 'AE',
      territoryId: 'T1',
      isPrimary: true,
    });

    // Simulate the post-swap row set: old row end-dated + new current row.
    const after = [
      a({ id: 'old', currentFlag: false }),
      a({ id: 'new', employeeId: 'E9', currentFlag: true }),
    ];
    expect(scopesWithMultipleCurrent(after)).toEqual([]);
  });

  it('scopesWithMultipleCurrent detects a broken invariant', () => {
    const broken = [
      a({ id: '1', currentFlag: true }),
      a({ id: '2', employeeId: 'E2', currentFlag: true }),
    ];
    expect(scopesWithMultipleCurrent(broken)).toHaveLength(1);
  });
});
