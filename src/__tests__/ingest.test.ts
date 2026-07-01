import { describe, expect, it } from 'vitest';

import {
  accountKeyOf,
  buildStaging,
  normalizeHeaderKey,
  normalizeRoleColumn,
  parseDelimited,
  resolveRoleColumns,
  SAMPLE_INGEST_SHEET,
  type IngestColumnConfig,
} from '@/domain/ingest';

const CONFIG: IngestColumnConfig = {
  accountNameColumn: 'Account',
  msSalesIdColumn: 'MSSalesAccountID',
  territoryColumn: 'Territory',
};

describe('parseDelimited', () => {
  it('parses comma-separated rows into keyed cells with 1-based source rows', () => {
    const sheet = parseDelimited('Account,Role\nContoso,KTANAKA\nFabrikam,HSATO');
    expect(sheet.headers).toEqual(['Account', 'Role']);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[0]).toEqual({
      sourceRow: 2,
      cells: { Account: 'Contoso', Role: 'KTANAKA' },
    });
    expect(sheet.rows[1].sourceRow).toBe(3);
  });

  it('auto-detects tab delimiter', () => {
    const sheet = parseDelimited('Account\tRole\nContoso\tKTANAKA');
    expect(sheet.headers).toEqual(['Account', 'Role']);
    expect(sheet.rows[0].cells).toEqual({ Account: 'Contoso', Role: 'KTANAKA' });
  });

  it('keeps commas inside quoted fields and unescapes doubled quotes', () => {
    const sheet = parseDelimited('Account,CSAM\nContoso,"KMURATA, SFUKUSAKO"\nFab,"a""b"');
    expect(sheet.rows[0].cells.CSAM).toBe('KMURATA, SFUKUSAKO');
    expect(sheet.rows[1].cells.CSAM).toBe('a"b');
  });

  it('skips fully blank lines and tolerates empty input', () => {
    expect(parseDelimited('').rows).toHaveLength(0);
    expect(parseDelimited('Account,Role\n\nContoso,X\n').rows).toHaveLength(1);
  });
});

describe('role-column normalization', () => {
  it('canonicalizes headers', () => {
    expect(normalizeHeaderKey('Copilot SE')).toBe('COPILOT_SE');
    expect(normalizeHeaderKey('  FY26_CE ')).toBe('FY26_CE');
  });

  it('maps known role columns and strips FY prefixes', () => {
    expect(normalizeRoleColumn('AE')).toBe('AE');
    expect(normalizeRoleColumn('Copilot SE')).toBe('COPILOT_SE');
    expect(normalizeRoleColumn('FY26_CE')).toBe('CE');
    expect(normalizeRoleColumn('Account')).toBeNull();
  });

  it('resolves role columns while skipping reserved columns and honouring overrides', () => {
    const cols = resolveRoleColumns(
      ['Account', 'MSSalesAccountID', 'Territory', 'AE', 'CSAM', 'Mystery'],
      { ...CONFIG, roleColumns: { Mystery: 'GBB' } }
    );
    expect(cols).toEqual({ AE: 'AE', CSAM: 'CSAM', Mystery: 'GBB' });
  });
});

describe('buildStaging', () => {
  it('splits multi-assignee cells, marks the first non-placeholder primary', () => {
    const sheet = parseDelimited(SAMPLE_INGEST_SHEET);
    const staging = buildStaging(sheet, CONFIG);

    const csam = staging.assignments.filter((a) => a.roleColumn === 'CSAM' && a.accountName === 'Contoso Ltd');
    expect(csam.map((a) => a.alias)).toEqual(['KMURATA', 'SFUKUSAKO']);
    expect(csam[0].isPrimary).toBe(true);
    expect(csam[1].isPrimary).toBe(false);
  });

  it('flags placeholder tokens and skips genuinely blank cells', () => {
    const sheet = parseDelimited(SAMPLE_INGEST_SHEET);
    const staging = buildStaging(sheet, CONFIG);

    const placeholders = staging.assignments.filter((a) => a.isPlaceholder);
    expect(placeholders.map((a) => a.alias).sort()).toEqual([
      'Move out to other segment',
      'TBH',
    ]);
    // Adventure Works has only blank role cells beyond AE → just the one AE row.
    const adv = staging.assignments.filter((a) => a.accountName === 'Adventure Works');
    expect(adv).toHaveLength(1);
    expect(adv[0].roleTypeCode).toBe('AE');
  });

  it('dedupes accounts by normalized key and captures ids + territory', () => {
    const sheet = parseDelimited(SAMPLE_INGEST_SHEET);
    const staging = buildStaging(sheet, CONFIG);
    expect(staging.accounts).toHaveLength(3);
    const contoso = staging.accounts.find((a) => a.accountKey === accountKeyOf('Contoso Ltd'));
    expect(contoso?.msSalesAccountId).toBe('1001');
    expect(contoso?.territoryCode).toBe('JPN.SMECC.RTL.0303');
  });
});
