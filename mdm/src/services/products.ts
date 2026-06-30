/**
 * Product master-data service: CRUD plus stewardship lifecycle transitions,
 * survivorship merge, and automatic quality scoring + audit logging.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import { scoreProduct } from '@/domain/quality';
import type { Product, RecordStatus, UnitOfMeasure } from '@/domain/types';

export interface ProductInput {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  gtin?: string;
  unitOfMeasure: UnitOfMeasure;
  listPrice?: number;
  currency?: string;
  sourceSystem?: string;
}

function products() {
  return getRayfinClient().data.Product;
}

/**
 * Explicit field projection. The Rayfin/DAB client only returns the primary key
 * unless fields are selected, so every read must enumerate the columns it needs.
 * Keep in sync with rayfin/data/Product.ts.
 */
const PRODUCT_FIELDS = [
  'id',
  'sku',
  'name',
  'description',
  'category',
  'brand',
  'gtin',
  'unitOfMeasure',
  'listPrice',
  'currency',
  'status',
  'isGolden',
  'qualityScore',
  'sourceSystem',
  'mergedIntoId',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
] as const;

function label(record: { sku: string; name: string }): string {
  return `${record.sku} — ${record.name}`;
}

export async function listProducts(): Promise<Product[]> {
  const rows = await products().select(PRODUCT_FIELDS).execute();
  return [...rows].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
  );
}

export function getProduct(id: string): Promise<Product | null> {
  return products().select(PRODUCT_FIELDS).where({ id: { eq: id } }).findFirst();
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const now = new Date();
  const quality = scoreProduct(input).score;
  const created = await products().create({
    ...input,
    status: 'draft',
    isGolden: false,
    qualityScore: quality,
    createdBy: actorId(),
    updatedBy: actorId(),
    createdAt: now,
    updatedAt: now,
  });
  await logAudit({
    domain: 'product',
    action: 'create',
    recordId: created.id,
    recordLabel: label(input),
    summary: `Created product ${input.name}`,
  });
  return created;
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<Product> {
  const quality = scoreProduct(input).score;
  const updated = await products().update(
    { id },
    {
      ...input,
      qualityScore: quality,
      updatedBy: actorId(),
      updatedAt: new Date(),
    }
  );
  await logAudit({
    domain: 'product',
    action: 'update',
    recordId: id,
    recordLabel: label(input),
    summary: `Updated product ${input.name}`,
  });
  return updated;
}

export async function setProductStatus(
  record: Product,
  status: RecordStatus,
  note?: string
): Promise<Product> {
  const isGolden = status === 'approved';
  const updated = await products().update(
    { id: record.id },
    { status, isGolden, updatedBy: actorId(), updatedAt: new Date() }
  );
  const action =
    status === 'pending_approval'
      ? 'submit'
      : status === 'approved'
        ? 'approve'
        : status === 'rejected'
          ? 'reject'
          : 'status_change';
  await logAudit({
    domain: 'product',
    action,
    recordId: record.id,
    recordLabel: label(record),
    summary: `Product ${record.name} → ${status}`,
    details: note,
  });
  return updated;
}

export async function mergeProducts(
  winner: Product,
  losers: Product[]
): Promise<void> {
  for (const loser of losers) {
    if (loser.id === winner.id) continue;
    await products().update(
      { id: loser.id },
      {
        status: 'merged',
        isGolden: false,
        mergedIntoId: winner.id,
        updatedBy: actorId(),
        updatedAt: new Date(),
      }
    );
    await logAudit({
      domain: 'product',
      action: 'merge',
      recordId: loser.id,
      recordLabel: label(loser),
      summary: `Merged ${loser.name} into ${winner.name}`,
      details: { winnerId: winner.id, winnerSku: winner.sku },
    });
  }
  await products().update(
    { id: winner.id },
    {
      status: 'approved',
      isGolden: true,
      updatedBy: actorId(),
      updatedAt: new Date(),
    }
  );
}

export async function deleteProduct(record: Product): Promise<void> {
  await products().delete({ id: record.id });
  await logAudit({
    domain: 'product',
    action: 'delete',
    recordId: record.id,
    recordLabel: label(record),
    summary: `Deleted product ${record.name}`,
  });
}
