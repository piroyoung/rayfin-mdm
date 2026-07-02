/**
 * Outbound port for first-run demo seeding. The dashboard triggers it on load so
 * the quality / dedup / stewardship views are meaningful out of the box. The
 * concrete adapter decides whether seeding is appropriate (local backend only)
 * and is idempotent; callers just request that seed data exist.
 */
export interface SeedService {
  /** Ensure demo master data exists. Safe to call repeatedly. */
  ensure(): Promise<void>;
}
