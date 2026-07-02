/**
 * Fiscal-year master persistence port. The current operating year drives every
 * territory/assignment screen, so the app depends on this interface and the
 * Rayfin-backed adapter lives in `src/infrastructure/data/`.
 */
import type { FiscalYear } from '@/domain/types';

export interface FiscalYearInput {
  code: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent?: boolean;
  isPlanningYear?: boolean;
  sortOrder?: number;
}

export interface FiscalYearRepository {
  /** All fiscal years, ordered by sortOrder then code. */
  list(): Promise<FiscalYear[]>;
  getById(id: string): Promise<FiscalYear | null>;
  create(input: FiscalYearInput): Promise<FiscalYear>;
  update(id: string, input: FiscalYearInput): Promise<FiscalYear>;
  /** Mark one fiscal year current and clear the flag on every other row. */
  setCurrent(id: string): Promise<void>;
}
