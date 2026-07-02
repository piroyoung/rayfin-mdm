/**
 * {@link SeedService} bridge adapter. Delegates to the legacy `ensureSeedData`
 * bootstrap (which still lives under `src/services/` as tracked backlog) so the
 * dashboard use case can depend on the port instead of importing the seeder
 * directly. When the seeder is migrated onto repository ports this adapter is
 * the only place that changes.
 */
import type { SeedService } from '@/domain/ports/seed-service';
import { ensureSeedData } from '@/services/seed';

export class LegacySeedService implements SeedService {
  async ensure(): Promise<void> {
    await ensureSeedData();
  }
}
