import type { AuditEvent } from './AuditEvent.js';
import type { ChangeRequest } from './ChangeRequest.js';
import type { Customer } from './Customer.js';
import type { Product } from './Product.js';
import type { ReferenceValue } from './ReferenceValue.js';

/**
 * Binds entity names to their classes so `RayfinClient` exposes typed
 * `client.data.<Entity>` GraphQL proxies. Every entity must be registered here.
 */
export type MdmSchema = {
  Customer: Customer;
  Product: Product;
  ChangeRequest: ChangeRequest;
  AuditEvent: AuditEvent;
  ReferenceValue: ReferenceValue;
};
