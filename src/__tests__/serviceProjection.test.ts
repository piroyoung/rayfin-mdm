/**
 * Regression guard for the Rayfin/DAB read projection.
 *
 * The underlying GraphQL client returns ONLY the primary key unless fields are
 * explicitly selected (`buildFieldSelection()` falls back to `id` for an empty
 * selection). If a service ever reverts to `findMany()` / `findById()` without a
 * `.select(...)`, list rows come back as `{ id }` only — every business field is
 * `undefined`, which blanks the tables and throws on edit.
 *
 * These tests assert the read paths request the business-key fields and that the
 * projected rows actually carry them.
 */
import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  state: {
    accountSelect: null as readonly string[] | null,
  },
}));

vi.mock('@/services/rayfinClient', () => {
  const makeEntity = (
    rows: unknown[],
    onSelect: (fields: readonly string[]) => void
  ) => {
    const builder = {
      where: () => builder,
      execute: async () => rows,
      findFirst: async () => rows[0] ?? null,
    };
    return {
      select: (fields: readonly string[]) => {
        onSelect(fields);
        return builder;
      },
    };
  };

  const sampleAccount = {
    id: 'a1',
    accountNumber: 'ACC-1001',
    nameLegal: 'Contoso Limited',
    nameDisplay: 'Contoso Ltd',
    segmentCode: 'enterprise',
    status: 'approved',
    updatedAt: new Date('2024-01-02T00:00:00Z').toISOString(),
  };

  return {
    getRayfinClient: () => ({
      data: {
        Account: makeEntity([sampleAccount], (f) => {
          h.state.accountSelect = f;
        }),
      },
    }),
    isLocalBackend: () => true,
  };
});

import { listAccounts } from '@/services/accounts';

describe('service read projection', () => {
  it('selects account business fields (not just id) and rows carry them', async () => {
    const rows = await listAccounts();

    expect(h.state.accountSelect).toBeTruthy();
    for (const field of [
      'id',
      'accountNumber',
      'nameLegal',
      'nameDisplay',
      'status',
      'updatedAt',
    ]) {
      expect(h.state.accountSelect).toContain(field);
    }
    expect(rows[0].accountNumber).toBe('ACC-1001');
    expect(rows[0].nameLegal).toBe('Contoso Limited');
  });
});
