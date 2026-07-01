/**
 * Projection regression guard for the territory-assignment services, mirroring
 * serviceProjection.test.ts: every list read must `.select(...)` its business
 * fields (the DAB client returns only the PK otherwise).
 */
import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  selects: {} as Record<string, readonly string[] | null>,
}));

vi.mock('@/services/rayfinClient', () => {
  const makeEntity = (key: string, rows: unknown[]) => {
    const builder = {
      where: () => builder,
      execute: async () => rows,
      findFirst: async () => rows[0] ?? null,
    };
    return {
      select: (fields: readonly string[]) => {
        h.selects[key] = fields;
        return builder;
      },
      create: async (v: Record<string, unknown>) => ({ id: 'new', ...v }),
      update: async (_k: unknown, v: Record<string, unknown>) => ({
        id: 'u',
        ...v,
      }),
      delete: async () => undefined,
    };
  };

  return {
    getRayfinClient: () => ({
      data: {
        FiscalYear: makeEntity('FiscalYear', [
          { id: 'fy1', code: 'FY26', name: 'FY26', sortOrder: 1 },
        ]),
        Role: makeEntity('Role', [
          { id: 'r1', code: 'AE', name: 'Account Executive', isActive: true },
        ]),
        Employee: makeEntity('Employee', [
          { id: 'e1', displayName: 'Hanako', alias: 'HMIZUKAMI', isActive: true },
        ]),
        Territory: makeEntity('Territory', [
          { id: 't1', territoryCode: 'JPN.01', territoryName: 'POD 1' },
        ]),
        TerritoryRoleAssignment: makeEntity('TerritoryRoleAssignment', [
          { id: 'tra1', territoryId: 't1', employeeId: 'e1', roleTypeCode: 'AE' },
        ]),
        TerritoryAccountAssignment: makeEntity('TerritoryAccountAssignment', [
          { id: 'ta1', accountId: 'a1', territoryId: 't1' },
        ]),
        SourceXref: makeEntity('SourceXref', [
          { id: 'x1', mdmEntityType: 'account', sourceSystem: 'CRM' },
        ]),
        DataQualityIssue: makeEntity('DataQualityIssue', [
          { id: 'd1', issueType: 'UNKNOWN_EMPLOYEE', severity: 'high' },
        ]),
        AuditEvent: makeEntity('AuditEvent', []),
      },
    }),
    isLocalBackend: () => true,
  };
});

import { listFiscalYears } from '@/services/fiscalYears';
import { listRoles } from '@/services/roles';
import { listEmployees } from '@/services/employees';
import { listTerritories } from '@/services/territories';
import { listTerritoryAssignments } from '@/services/assignments';
import { listTerritoryRoleAssignments } from '@/services/territoryRoleAssignments';
import { listSourceXrefs } from '@/services/sourceXref';
import { listDataQualityIssues } from '@/services/dataQuality';

describe('territory-assignment service projections', () => {
  it('selects fiscal-year business fields', async () => {
    await listFiscalYears();
    for (const f of ['id', 'code', 'name', 'isCurrent'])
      expect(h.selects.FiscalYear).toContain(f);
  });

  it('selects role business fields', async () => {
    await listRoles();
    for (const f of ['id', 'code', 'name', 'isActive'])
      expect(h.selects.Role).toContain(f);
  });

  it('selects employee business fields', async () => {
    await listEmployees();
    for (const f of ['id', 'displayName', 'alias', 'upn', 'email', 'isActive'])
      expect(h.selects.Employee).toContain(f);
  });

  it('selects territory business fields', async () => {
    await listTerritories();
    for (const f of ['id', 'territoryCode', 'territoryName', 'parentTerritoryId'])
      expect(h.selects.Territory).toContain(f);
  });

  it('selects territory-role-assignment business fields', async () => {
    await listTerritoryRoleAssignments();
    for (const f of ['id', 'territoryId', 'employeeId', 'roleTypeCode', 'fiscalYearId'])
      expect(h.selects.TerritoryRoleAssignment).toContain(f);
  });

  it('selects territory-assignment business fields', async () => {
    await listTerritoryAssignments();
    for (const f of ['id', 'accountId', 'territoryId', 'fiscalYearId'])
      expect(h.selects.TerritoryAccountAssignment).toContain(f);
  });

  it('selects source-xref business fields', async () => {
    await listSourceXrefs();
    for (const f of ['id', 'mdmEntityType', 'mdmEntityId', 'sourceSystem', 'sourceRecordId'])
      expect(h.selects.SourceXref).toContain(f);
  });

  it('selects data-quality business fields', async () => {
    await listDataQualityIssues();
    for (const f of ['id', 'issueType', 'severity', 'resolutionStatus'])
      expect(h.selects.DataQualityIssue).toContain(f);
  });
});
