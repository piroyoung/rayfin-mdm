/**
 * Customer master-data service: CRUD plus stewardship lifecycle transitions,
 * survivorship merge, and automatic quality scoring + audit logging.
 */
import { getRayfinClient } from '@/services/rayfinClient';
import { actorId } from '@/services/session';
import { logAudit } from '@/services/audit';
import { scoreCustomer } from '@/domain/quality';
import type { Customer, CustomerSegment, RecordStatus } from '@/domain/types';

/** Steward-editable fields of a customer (everything else is system-managed). */
export interface CustomerInput {
  customerCode: string;
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  website?: string;
  segment: CustomerSegment;
  industry?: string;
  addressLine1?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  countryCode?: string;
  sourceSystem?: string;
}

function customers() {
  return getRayfinClient().data.Customer;
}

/**
 * Explicit field projection — the Rayfin/DAB client returns only the primary key
 * unless fields are selected. Keep in sync with rayfin/data/Customer.ts.
 */
const CUSTOMER_FIELDS = [
  'id',
  'customerCode',
  'name',
  'legalName',
  'email',
  'phone',
  'taxId',
  'website',
  'segment',
  'industry',
  'addressLine1',
  'city',
  'stateProvince',
  'postalCode',
  'countryCode',
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

function label(record: { customerCode: string; name: string }): string {
  return `${record.customerCode} — ${record.name}`;
}

export async function listCustomers(): Promise<Customer[]> {
  const rows = await customers().select(CUSTOMER_FIELDS).execute();
  return [...rows].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
  );
}

export function getCustomer(id: string): Promise<Customer | null> {
  return customers()
    .select(CUSTOMER_FIELDS)
    .where({ id: { eq: id } })
    .findFirst();
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const now = new Date();
  const quality = scoreCustomer(input).score;
  const created = await customers().create({
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
    domain: 'customer',
    action: 'create',
    recordId: created.id,
    recordLabel: label(input),
    summary: `Created customer ${input.name}`,
  });
  return created;
}

export async function updateCustomer(
  id: string,
  input: CustomerInput
): Promise<Customer> {
  const quality = scoreCustomer(input).score;
  const updated = await customers().update(
    { id },
    {
      ...input,
      qualityScore: quality,
      updatedBy: actorId(),
      updatedAt: new Date(),
    }
  );
  await logAudit({
    domain: 'customer',
    action: 'update',
    recordId: id,
    recordLabel: label(input),
    summary: `Updated customer ${input.name}`,
  });
  return updated;
}

/** Move a customer through its lifecycle; approval promotes it to golden. */
export async function setCustomerStatus(
  record: Customer,
  status: RecordStatus,
  note?: string
): Promise<Customer> {
  const isGolden = status === 'approved';
  const updated = await customers().update(
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
    domain: 'customer',
    action,
    recordId: record.id,
    recordLabel: label(record),
    summary: `Customer ${record.name} → ${status}`,
    details: note,
  });
  return updated;
}

/**
 * Survivorship merge: each loser is flagged `merged` and pointed at the winner,
 * which becomes the approved golden record.
 */
export async function mergeCustomers(
  winner: Customer,
  losers: Customer[]
): Promise<void> {
  for (const loser of losers) {
    if (loser.id === winner.id) continue;
    await customers().update(
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
      domain: 'customer',
      action: 'merge',
      recordId: loser.id,
      recordLabel: label(loser),
      summary: `Merged ${loser.name} into ${winner.name}`,
      details: { winnerId: winner.id, winnerCode: winner.customerCode },
    });
  }
  await customers().update(
    { id: winner.id },
    {
      status: 'approved',
      isGolden: true,
      updatedBy: actorId(),
      updatedAt: new Date(),
    }
  );
}

export async function deleteCustomer(record: Customer): Promise<void> {
  await customers().delete({ id: record.id });
  await logAudit({
    domain: 'customer',
    action: 'delete',
    recordId: record.id,
    recordLabel: label(record),
    summary: `Deleted customer ${record.name}`,
  });
}
