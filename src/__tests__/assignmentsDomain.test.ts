/**
 * Unit tests for the pure assignment / hierarchy / identity helpers. No Rayfin
 * client is touched, so these run without any backend or mock.
 */
import { describe, expect, it } from 'vitest';
import {
  isPlaceholderName,
  splitMultiValueCell,
  findMultiplePrimaryGroups,
  planPrimaryToggle,
  type PrimaryScopeRow,
} from '@/domain/assignments';
import { detectCycles, wouldCreateCycle } from '@/domain/hierarchy';
import { findEmployeeIdentityConflicts } from '@/domain/policies/employee-conflicts';
import type { Employee } from '@/domain/types';

const row = (over: Partial<PrimaryScopeRow> & { id: string }): PrimaryScopeRow => ({
  accountId: 'A',
  roleTypeCode: 'AE',
  fiscalYearId: 'FY26',
  isPrimary: false,
  currentFlag: true,
  ...over,
});

describe('splitMultiValueCell', () => {
  it('splits on comma / semicolon / newline and trims + dedupes', () => {
    expect(splitMultiValueCell('KMURATA, SFUKUSAKO;KMURATA\nHTANAKA')).toEqual([
      'KMURATA',
      'SFUKUSAKO',
      'HTANAKA',
    ]);
  });

  it('keeps "n/a" intact (slash is not a separator)', () => {
    expect(splitMultiValueCell('n/a')).toEqual(['n/a']);
  });

  it('returns [] for blank/nullish input', () => {
    expect(splitMultiValueCell('')).toEqual([]);
    expect(splitMultiValueCell(null)).toEqual([]);
    expect(splitMultiValueCell('  ,  ;')).toEqual([]);
  });
});

describe('isPlaceholderName', () => {
  it('treats TBH/vacant/blank as placeholders', () => {
    for (const v of ['TBH', 'tba', 'Vacant', 'OPEN', '', null, undefined]) {
      expect(isPlaceholderName(v)).toBe(true);
    }
  });

  it('treats a real alias as a real person', () => {
    expect(isPlaceholderName('HMIZUKAMI')).toBe(false);
  });
});

describe('findMultiplePrimaryGroups', () => {
  it('flags >1 current primary in the same account/role/FY scope', () => {
    const groups = findMultiplePrimaryGroups([
      row({ id: '1', isPrimary: true }),
      row({ id: '2', isPrimary: true }),
      row({ id: '3', isPrimary: false }),
      row({ id: '4', isPrimary: true, roleTypeCode: 'CSAM' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].rows.map((r) => r.id).sort()).toEqual(['1', '2']);
  });

  it('ignores non-current rows', () => {
    const groups = findMultiplePrimaryGroups([
      row({ id: '1', isPrimary: true }),
      row({ id: '2', isPrimary: true, currentFlag: false }),
    ]);
    expect(groups).toHaveLength(0);
  });
});

describe('planPrimaryToggle', () => {
  it('promotes the target and demotes current siblings in scope', () => {
    const changes = planPrimaryToggle(
      [
        row({ id: '1', isPrimary: true }),
        row({ id: '2', isPrimary: false }),
        row({ id: '3', isPrimary: false, roleTypeCode: 'CSAM' }),
      ],
      '2'
    );
    expect(changes.sort((a, b) => a.id.localeCompare(b.id))).toEqual([
      { id: '1', isPrimary: false },
      { id: '2', isPrimary: true },
    ]);
  });

  it('returns no changes when the target is already the sole primary', () => {
    expect(
      planPrimaryToggle([row({ id: '1', isPrimary: true })], '1')
    ).toEqual([]);
  });
});

describe('detectCycles / wouldCreateCycle', () => {
  it('finds a self-cycle', () => {
    expect([...detectCycles([{ id: 'a', parentId: 'a' }])]).toEqual(['a']);
  });

  it('finds a multi-node cycle but leaves acyclic chains alone', () => {
    const cycle = detectCycles([
      { id: 'a', parentId: 'b' },
      { id: 'b', parentId: 'c' },
      { id: 'c', parentId: 'a' },
      { id: 'd', parentId: 'a' },
      { id: 'e' },
    ]);
    expect([...cycle].sort()).toEqual(['a', 'b', 'c']);
  });

  it('tolerates edges to missing parents', () => {
    expect(detectCycles([{ id: 'a', parentId: 'ghost' }]).size).toBe(0);
  });

  it('wouldCreateCycle catches self and ancestor loops', () => {
    const nodes = [
      { id: 'a', parentId: undefined },
      { id: 'b', parentId: 'a' },
    ];
    expect(wouldCreateCycle(nodes, 'a', 'a')).toBe(true);
    expect(wouldCreateCycle(nodes, 'a', 'b')).toBe(true);
    expect(wouldCreateCycle(nodes, 'b', 'a')).toBe(false);
    expect(wouldCreateCycle(nodes, 'b', null)).toBe(false);
  });
});

describe('findEmployeeIdentityConflicts', () => {
  const emp = (over: Partial<Employee> & { id: string }): Employee =>
    ({
      isActive: true,
      displayName: over.id,
      ...over,
    }) as Employee;

  it('reports alias/upn/email shared by >1 active employee (case-insensitive)', () => {
    const conflicts = findEmployeeIdentityConflicts([
      emp({ id: '1', alias: 'HMIZUKAMI', email: 'a@x.com' }),
      emp({ id: '2', alias: 'hmizukami', email: 'b@x.com' }),
      emp({ id: '3', email: 'A@x.com' }),
    ]);
    const alias = conflicts.find((c) => c.field === 'alias');
    const email = conflicts.find((c) => c.field === 'email');
    expect(alias?.ids.sort()).toEqual(['1', '2']);
    expect(email?.ids.sort()).toEqual(['1', '3']);
  });

  it('ignores inactive employees and blank values', () => {
    const conflicts = findEmployeeIdentityConflicts([
      emp({ id: '1', alias: 'DUP' }),
      emp({ id: '2', alias: 'DUP', isActive: false }),
      emp({ id: '3' }),
    ]);
    expect(conflicts).toHaveLength(0);
  });
});
