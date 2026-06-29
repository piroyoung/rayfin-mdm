/**
 * Duplicate detection across master records. Uses a union-find over normalized
 * match keys (email, tax id, name+country for customers; gtin, name+brand for
 * products) so transitively-linked records collapse into a single group.
 */
import { isActiveStatus, type Customer, type Product } from './types';

export interface DuplicateGroup<T> {
  /** Stable group key (the union-find root id). */
  key: string;
  /** Human-readable match reasons that formed this group. */
  reasons: string[];
  /** The records in the group (length >= 2). */
  records: T[];
}

interface KeyFn<T> {
  reason: string;
  fn: (record: T) => string | undefined;
}

function norm(value?: string | null): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildGroups<T extends { id: string }>(
  rows: T[],
  keyFns: KeyFn<T>[]
): DuplicateGroup<T>[] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let p = parent.get(x) ?? x;
    if (p !== x) {
      p = find(p);
      parent.set(x, p);
    }
    return p;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  rows.forEach((r) => parent.set(r.id, r.id));

  for (const kf of keyFns) {
    const buckets = new Map<string, string[]>();
    for (const r of rows) {
      const k = kf.fn(r);
      if (!k) continue;
      const arr = buckets.get(k) ?? [];
      arr.push(r.id);
      buckets.set(k, arr);
    }
    for (const ids of buckets.values()) {
      for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
    }
  }

  const byRoot = new Map<string, T[]>();
  for (const r of rows) {
    const root = find(r.id);
    const arr = byRoot.get(root) ?? [];
    arr.push(r);
    byRoot.set(root, arr);
  }

  const groups: DuplicateGroup<T>[] = [];
  for (const [root, records] of byRoot) {
    if (records.length < 2) continue;
    const reasons: string[] = [];
    for (const kf of keyFns) {
      const counts = new Map<string, number>();
      for (const r of records) {
        const k = kf.fn(r);
        if (!k) continue;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      if ([...counts.values()].some((c) => c >= 2)) reasons.push(kf.reason);
    }
    groups.push({ key: root, reasons, records });
  }

  groups.sort((a, b) => b.records.length - a.records.length);
  return groups;
}

export function findCustomerDuplicates(
  rows: Customer[]
): DuplicateGroup<Customer>[] {
  const active = rows.filter((r) => isActiveStatus(r.status));
  return buildGroups(active, [
    { reason: 'Same email', fn: (r) => norm(r.email) || undefined },
    { reason: 'Same tax ID', fn: (r) => norm(r.taxId) || undefined },
    {
      reason: 'Same name & country',
      fn: (r) => (r.name ? `${norm(r.name)}|${norm(r.countryCode)}` : undefined),
    },
  ]);
}

export function findProductDuplicates(
  rows: Product[]
): DuplicateGroup<Product>[] {
  const active = rows.filter((r) => isActiveStatus(r.status));
  return buildGroups(active, [
    { reason: 'Same GTIN', fn: (r) => norm(r.gtin) || undefined },
    {
      reason: 'Same name & brand',
      fn: (r) => (r.name ? `${norm(r.name)}|${norm(r.brand)}` : undefined),
    },
  ]);
}
