import { describe, expect, it } from 'vitest';

import {
  buildAliasIndex,
  classifyTerritory,
  normalizeTerritoryCode,
  resolveAlias,
  type EmployeeLike,
} from '@/domain/aliasMap';

const EMPLOYEES: EmployeeLike[] = [
  { id: 'e1', alias: 'KTANAKA', upn: 'ktanaka@contoso.com', displayName: 'Kenji Tanaka', personnelNumber: 'P001' },
  { id: 'e2', alias: 'HSATO', email: 'hsato@contoso.com', displayName: 'Haruki Sato' },
  { id: 'e3', alias: 'KMURATA', displayName: 'Kaori Murata' },
  // e4/e5 deliberately share an alias to exercise ambiguity.
  { id: 'e4', alias: 'JLEE', displayName: 'Jamie Lee' },
  { id: 'e5', alias: 'JLEE', displayName: 'Jordan Lee' },
];

const INDEX = buildAliasIndex(EMPLOYEES);

describe('resolveAlias', () => {
  it('matches on exact alias (case-insensitive)', () => {
    expect(resolveAlias(INDEX, 'ktanaka')).toEqual({
      status: 'matched',
      employeeId: 'e1',
      via: 'alias',
    });
  });

  it('matches a UPN/email local part', () => {
    const r = resolveAlias(INDEX, 'hsato@contoso.com');
    expect(r).toEqual({ status: 'matched', employeeId: 'e2', via: 'alias' });
  });

  it('matches on display name when nothing higher-priority hits', () => {
    expect(resolveAlias(INDEX, 'Kaori Murata')).toMatchObject({
      status: 'matched',
      employeeId: 'e3',
    });
  });

  it('returns ambiguous when an alias maps to several employees', () => {
    expect(resolveAlias(INDEX, 'JLEE')).toEqual({
      status: 'ambiguous',
      employeeIds: ['e4', 'e5'],
    });
  });

  it('returns unknown for unmatched or empty aliases', () => {
    expect(resolveAlias(INDEX, 'NOBODY')).toEqual({ status: 'unknown' });
    expect(resolveAlias(INDEX, '   ')).toEqual({ status: 'unknown' });
  });
});

describe('territory classification', () => {
  it('normalizes whitespace and case', () => {
    expect(normalizeTerritoryCode(' jpn.smecc.rtl.0303 ')).toBe('JPN.SMECC.RTL.0303');
  });

  it('accepts well-formed dotted codes', () => {
    const klass = classifyTerritory('JPN.SMECC.RTL.0303');
    expect(klass.valid).toBe(true);
    expect(klass.territoryType).toBe('SALES_TERRITORY');
  });

  it('flags POD territories', () => {
    expect(classifyTerritory('JPN.POD.001').territoryType).toBe('POD');
  });

  it('rejects free-text / empty values', () => {
    expect(classifyTerritory('not a territory').valid).toBe(false);
    expect(classifyTerritory('').valid).toBe(false);
  });
});
