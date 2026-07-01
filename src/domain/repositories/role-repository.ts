/**
 * Role master persistence port. The role catalogue is edited as data (a new FY
 * role is a new row), so the app depends on this interface and the Rayfin-backed
 * adapter lives in `src/infrastructure/data/`.
 */
import type { Role } from '@/domain/types';

export interface RoleInput {
  /** Optional: auto-generated from `name` when omitted (UI never sets it). */
  code?: string;
  name: string;
  description?: string;
  orgUnit?: string;
  solutionArea?: string;
  subArea?: string;
  roleFamily?: string;
  isAccountAssignable?: boolean;
  isTerritoryAssignable?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export interface RoleRepository {
  /** All roles, ordered by sortOrder then name. */
  list(): Promise<Role[]>;

  /** Active roles that can be attached to an account-level assignment. */
  listAccountAssignable(): Promise<Role[]>;

  getById(id: string): Promise<Role | null>;

  /** Create a role, resolving a unique `code` and stamping the actor. */
  create(input: RoleInput): Promise<Role>;

  update(id: string, input: RoleInput): Promise<Role>;
}
