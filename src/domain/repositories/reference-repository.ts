/**
 * Reference-data persistence port. Governed code lists (country, segment,
 * lifecycle stage…) are edited as data and shared across domains, so the app
 * depends on this interface and the Rayfin-backed adapter lives in
 * `src/infrastructure/data/`.
 */
import type { ReferenceValue } from '@/domain/types';

export interface ReferenceInput {
  setName: string;
  code: string;
  label: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ReferenceRepository {
  /** All reference values, ordered by set, then sortOrder, then label. */
  list(): Promise<ReferenceValue[]>;
  create(input: ReferenceInput): Promise<ReferenceValue>;
  update(id: string, input: ReferenceInput): Promise<ReferenceValue>;
  delete(id: string): Promise<void>;
}
