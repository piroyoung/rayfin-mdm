import { describe, expect, it } from 'vitest';

import { buildAliasIndex, type EmployeeLike } from '@/domain/aliasMap';
import { accountKeyOf, buildStaging, parseDelimited, SAMPLE_INGEST_SHEET } from '@/domain/ingest';
import { planIngest } from '@/domain/ingestPlan';

const EMPLOYEES: EmployeeLike[] = [
  { id: 'e-ktanaka', alias: 'KTANAKA', displayName: 'Kenji Tanaka' },
  { id: 'e-hsato', alias: 'HSATO', displayName: 'Haruki Sato' },
  { id: 'e-kmurata', alias: 'KMURATA', displayName: 'Kaori Murata' },
  { id: 'e-sfukusako', alias: 'SFUKUSAKO', displayName: 'Sora Fukusako' },
  // RJOHNSON intentionally absent → unknown alias.
];

function plan(existing: string[] = []) {
  const staging = buildStaging(parseDelimited(SAMPLE_INGEST_SHEET), {
    accountNameColumn: 'Account',
    msSalesIdColumn: 'MSSalesAccountID',
    territoryColumn: 'Territory',
  });
  return planIngest(staging, {
    aliasIndex: buildAliasIndex(EMPLOYEES),
    existingAccountKeys: new Set(existing),
  });
}

describe('planIngest', () => {
  it('creates assignment intents for matched aliases, preserving primary', () => {
    const { intents } = plan();
    const contosoCsam = intents.filter(
      (i) => i.accountName === 'Contoso Ltd' && i.roleTypeCode === 'CSAM'
    );
    expect(contosoCsam.map((i) => i.employeeId).sort()).toEqual([
      'e-kmurata',
      'e-sfukusako',
    ]);
    expect(contosoCsam.find((i) => i.employeeId === 'e-kmurata')?.isPrimary).toBe(true);
    expect(contosoCsam.find((i) => i.employeeId === 'e-sfukusako')?.isPrimary).toBe(false);
  });

  it('raises UNKNOWN_EMPLOYEE for unmatched aliases', () => {
    const { issues } = plan();
    const unknown = issues.filter((i) => i.issueType === 'UNKNOWN_EMPLOYEE');
    expect(unknown.length).toBeGreaterThan(0);
    expect(unknown.some((i) => i.description.includes('RJOHNSON'))).toBe(true);
  });

  it('raises INVALID_TERRITORY for free-text territory codes', () => {
    const { issues } = plan();
    const invalid = issues.filter((i) => i.issueType === 'INVALID_TERRITORY');
    expect(invalid).toHaveLength(1);
    expect(invalid[0].description).toContain('Adventure Works');
  });

  it('raises UNRESOLVED_PLACEHOLDER and does not create an intent for TBH/move-out', () => {
    const { issues, intents } = plan();
    const placeholders = issues.filter((i) => i.issueType === 'UNRESOLVED_PLACEHOLDER');
    expect(placeholders).toHaveLength(2);
    expect(intents.some((i) => /TBH|Move out/i.test(i.employeeId))).toBe(false);
  });

  it('reports ambiguous aliases distinctly', () => {
    const staging = buildStaging(parseDelimited('Account,AE\nAcme,JLEE'), {
      accountNameColumn: 'Account',
    });
    const ambIndex = buildAliasIndex([
      { id: 'a', alias: 'JLEE', displayName: 'Jamie Lee' },
      { id: 'b', alias: 'JLEE', displayName: 'Jordan Lee' },
    ]);
    const { issues, intents } = planIngest(staging, { aliasIndex: ambIndex });
    expect(intents).toHaveLength(0);
    expect(issues[0].issueType).toBe('ALIAS_AMBIGUOUS');
  });

  it('counts new vs existing accounts', () => {
    const withExisting = plan([accountKeyOf('Contoso Ltd')]);
    expect(withExisting.stats.accounts).toBe(3);
    expect(withExisting.stats.newAccounts).toBe(2);
    expect(withExisting.newAccountKeys).not.toContain(accountKeyOf('Contoso Ltd'));
  });
});
