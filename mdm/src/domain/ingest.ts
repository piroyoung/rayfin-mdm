/**
 * Pure Excel/CSV ingest helpers for the wide FY territory-assignment sheet.
 * No Rayfin/network dependency, so the whole parse→staging step is unit-testable.
 *
 * The operational workbook is "wide": one row per account, with a set of role
 * columns (AE, CSAM, "Copilot SE", FY26_CE, …) each holding one or more assignee
 * aliases in a single cell ("KMURATA, SFUKUSAKO"). This module turns that into
 * normalized staging rows — one assignee per row — ready for alias name-matching
 * in `@/domain/ingestPlan`.
 */
import { isPlaceholderName, splitMultiValueCell } from '@/domain/assignments';

// ── Delimited parsing ──────────────────────────────────────────────────────

export interface ParsedRow {
  /** 1-based row number in the source sheet (the header is row 1). */
  sourceRow: number;
  cells: Record<string, string>;
}

export interface ParsedSheet {
  headers: string[];
  rows: ParsedRow[];
}

/**
 * Split raw text into records of fields, honouring RFC-4180-style quoting
 * (double-quoted fields, `""` escapes, delimiters/newlines inside quotes).
 */
function splitRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      field = '';
      records.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  records.push(row);
  return records;
}

/** Pick the delimiter from the header line: tab if present, otherwise comma. */
function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? undefined : text.indexOf('\n'));
  return firstLine.includes('\t') ? '\t' : ',';
}

/**
 * Parse CSV/TSV text into a header list and keyed rows. The delimiter is
 * auto-detected (tab vs comma) unless one is supplied. Empty input yields an
 * empty sheet rather than throwing.
 */
export function parseDelimited(text: string, delimiter?: string): ParsedSheet {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  if (!normalized.trim()) return { headers: [], rows: [] };

  const delim = delimiter ?? detectDelimiter(normalized);
  const records = splitRecords(normalized, delim);
  const [headerCells, ...dataCells] = records;
  const headers = headerCells.map((h) => h.trim());

  const rows: ParsedRow[] = dataCells
    .filter((cells) => cells.some((c) => c.trim() !== ''))
    .map((cells, index) => ({
      sourceRow: index + 2,
      cells: Object.fromEntries(
        headers.map((h, j) => [h, (cells[j] ?? '').trim()])
      ),
    }));

  return { headers, rows };
}

// ── Role-column normalization ──────────────────────────────────────────────

/** Canonicalize a header for lookup: `"Copilot SE"` → `COPILOT_SE`. */
export function normalizeHeaderKey(header: string): string {
  return header
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Default mapping of (normalized) role-column headers to canonical
 * `roleTypeCode`s. Mirrors the role catalogue seeded in `services/seed.ts`.
 * Fiscal-year prefixes (e.g. `FY26_CE`) are stripped before lookup.
 */
export const DEFAULT_ROLE_COLUMNS: Record<string, string> = {
  AE: 'AE',
  ACCOUNT_EXECUTIVE: 'AE',
  DAE: 'DAE',
  DIGITAL_AE: 'DAE',
  CSAM: 'CSAM',
  CE: 'CE',
  CLOUD_ENGINEER: 'CE',
  CUSTOMER_ENGINEER: 'CE',
  SE: 'SE',
  SOLUTION_ENGINEER: 'SE',
  COPILOT_SE: 'COPILOT_SE',
  SECURITY_SE: 'SECURITY_SE',
  INFRA_SE: 'INFRA_SE',
  DATA_AI_SE: 'DATA_AI_SE',
  APPS_SE: 'APPS_SE',
  SSP: 'SSP',
  SPECIALIST: 'SSP',
  ATS: 'ATS',
  ACCOUNT_TECH_STRATEGIST: 'ATS',
  GBB: 'GBB',
  MANAGER: 'MANAGER',
  POD_LEAD: 'POD_LEAD',
};

/** Resolve a column header to a `roleTypeCode`, or `null` if it is not a role. */
export function normalizeRoleColumn(header: string): string | null {
  const key = normalizeHeaderKey(header).replace(/^FY\d{2}_/, '');
  return DEFAULT_ROLE_COLUMNS[key] ?? null;
}

// ── Wide → long staging ─────────────────────────────────────────────────────

export interface IngestColumnConfig {
  accountNameColumn: string;
  msSalesIdColumn?: string;
  crmIdColumn?: string;
  territoryColumn?: string;
  /** Explicit header→roleTypeCode overrides, merged over auto-detection. */
  roleColumns?: Record<string, string>;
}

export interface StgAccount {
  sourceRow: number;
  /** Normalized natural key used to match the canonical account (lower name). */
  accountKey: string;
  name: string;
  msSalesAccountId?: string;
  crmAccountId?: string;
  territoryCode?: string;
}

export interface StgAssignment {
  sourceRow: number;
  accountKey: string;
  accountName: string;
  territoryCode?: string;
  roleColumn: string;
  roleTypeCode: string;
  rawCell: string;
  alias: string;
  isPrimary: boolean;
  isPlaceholder: boolean;
}

export interface StagingResult {
  accounts: StgAccount[];
  assignments: StgAssignment[];
  /** Header→roleTypeCode map actually applied (auto-detected + overrides). */
  roleColumns: Record<string, string>;
}

/** Lower-case, trimmed account key so ingest matches the canonical master. */
export function accountKeyOf(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Resolve which columns are role columns: every header that is not one of the
 * configured account/id/territory columns is run through `normalizeRoleColumn`,
 * with any explicit `config.roleColumns` overrides taking precedence.
 */
export function resolveRoleColumns(
  headers: string[],
  config: IngestColumnConfig
): Record<string, string> {
  const reserved = new Set(
    [
      config.accountNameColumn,
      config.msSalesIdColumn,
      config.crmIdColumn,
      config.territoryColumn,
    ].filter(Boolean) as string[]
  );
  const out: Record<string, string> = {};
  for (const header of headers) {
    if (reserved.has(header)) continue;
    const override = config.roleColumns?.[header];
    const code = override ?? normalizeRoleColumn(header);
    if (code) out[header] = code;
  }
  return out;
}

/**
 * Decompose a wide assignment sheet into staging accounts + assignments.
 *
 * - Multi-assignee cells are split into one row each (`splitMultiValueCell`).
 * - The first non-placeholder assignee in a role cell is marked `isPrimary`.
 * - Placeholder tokens (`TBH`, `TBA`, `Move out to other segment`, …) are
 *   surfaced as rows with `isPlaceholder=true` so the plan step can raise a
 *   data-quality issue; genuinely blank cells are skipped.
 */
export function buildStaging(
  sheet: ParsedSheet,
  config: IngestColumnConfig
): StagingResult {
  const roleColumns = resolveRoleColumns(sheet.headers, config);
  const accountsByKey = new Map<string, StgAccount>();
  const assignments: StgAssignment[] = [];

  for (const row of sheet.rows) {
    const name = (row.cells[config.accountNameColumn] ?? '').trim();
    if (!name) continue;
    const accountKey = accountKeyOf(name);
    const territoryCode = config.territoryColumn
      ? row.cells[config.territoryColumn]?.trim() || undefined
      : undefined;

    if (!accountsByKey.has(accountKey)) {
      accountsByKey.set(accountKey, {
        sourceRow: row.sourceRow,
        accountKey,
        name,
        msSalesAccountId: config.msSalesIdColumn
          ? row.cells[config.msSalesIdColumn]?.trim() || undefined
          : undefined,
        crmAccountId: config.crmIdColumn
          ? row.cells[config.crmIdColumn]?.trim() || undefined
          : undefined,
        territoryCode,
      });
    }

    for (const [header, roleTypeCode] of Object.entries(roleColumns)) {
      const rawCell = (row.cells[header] ?? '').trim();
      const names = splitMultiValueCell(rawCell);
      if (names.length === 0) continue;
      const primaryAlias = names.find((n) => !isPlaceholderName(n));
      for (const alias of names) {
        assignments.push({
          sourceRow: row.sourceRow,
          accountKey,
          accountName: name,
          territoryCode,
          roleColumn: header,
          roleTypeCode,
          rawCell,
          alias,
          isPrimary: alias === primaryAlias,
          isPlaceholder: isPlaceholderName(alias),
        });
      }
    }
  }

  return {
    accounts: [...accountsByKey.values()],
    assignments,
    roleColumns,
  };
}

/**
 * A small wide sample sheet used by the ingest page's "Load sample" button and
 * by tests. Aliases line up with the demo employees seeded in `services/seed.ts`
 * so a steward can run preview → commit end-to-end out of the box.
 */
export const SAMPLE_INGEST_SHEET = [
  'Account,MSSalesAccountID,Territory,AE,CSAM,Copilot SE,CE',
  'Contoso Ltd,1001,JPN.SMECC.RTL.0303,KTANAKA,"KMURATA, SFUKUSAKO",HSATO,TBH',
  'Fabrikam Inc,1010,JPN.SMECC.MFG.0101,SFUKUSAKO,RJOHNSON,,Move out to other segment',
  'Adventure Works,1020,not a territory,KTANAKA,,,',
].join('\n');
