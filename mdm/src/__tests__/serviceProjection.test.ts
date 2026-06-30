/**
 * Regression guard for the Rayfin/DAB read projection.
 *
 * The underlying GraphQL client returns ONLY the primary key unless fields are
 * explicitly selected (`buildFieldSelection()` falls back to `id` for an empty
 * selection). If a service ever reverts to `findMany()` / `findById()` without a
 * `.select(...)`, list rows come back as `{ id }` only — every business field is
 * `undefined`, which blanks the tables and throws (`form.sku.trim()`) on edit.
 *
 * These tests assert the read paths request the business-key fields and that the
 * projected rows actually carry them.
 */
import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  state: {
    productSelect: null as readonly string[] | null,
    customerSelect: null as readonly string[] | null,
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

  const sampleProduct = {
    id: 'p1',
    sku: 'SKU-9001',
    name: 'Surface Laptop 7',
    status: 'approved',
    unitOfMeasure: 'each',
    updatedAt: new Date('2024-01-02T00:00:00Z').toISOString(),
  };
  const sampleCustomer = {
    id: 'c1',
    customerCode: 'CUST-1001',
    name: 'Contoso Ltd',
    segment: 'enterprise',
    status: 'approved',
    updatedAt: new Date('2024-01-02T00:00:00Z').toISOString(),
  };

  return {
    getRayfinClient: () => ({
      data: {
        Product: makeEntity([sampleProduct], (f) => {
          h.state.productSelect = f;
        }),
        Customer: makeEntity([sampleCustomer], (f) => {
          h.state.customerSelect = f;
        }),
      },
    }),
    isLocalBackend: () => true,
  };
});

import { listProducts } from '@/services/products';
import { listCustomers } from '@/services/customers';

describe('service read projection', () => {
  it('selects product business fields (not just id) and rows carry them', async () => {
    const rows = await listProducts();

    expect(h.state.productSelect).toBeTruthy();
    for (const field of ['id', 'sku', 'name', 'status', 'updatedAt']) {
      expect(h.state.productSelect).toContain(field);
    }
    expect(rows[0].sku).toBe('SKU-9001');
    expect(rows[0].name).toBe('Surface Laptop 7');
  });

  it('selects customer business fields (not just id) and rows carry them', async () => {
    const rows = await listCustomers();

    expect(h.state.customerSelect).toBeTruthy();
    for (const field of ['id', 'customerCode', 'name', 'status', 'updatedAt']) {
      expect(h.state.customerSelect).toContain(field);
    }
    expect(rows[0].customerCode).toBe('CUST-1001');
    expect(rows[0].name).toBe('Contoso Ltd');
  });
});
