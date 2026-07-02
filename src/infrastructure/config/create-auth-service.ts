/**
 * Strategy selector for the auth adapter: local mock vs Fabric brokered auth,
 * chosen from {@link AppConfig}. Called once in the composition root.
 */
import type { AuthService } from '@/domain/ports/auth-service';
import { MockAuthService } from '@/infrastructure/auth/mock-auth-service';
import { RayfinAuthService } from '@/infrastructure/auth/rayfin-auth-service';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

import type { AppConfig } from './read-config';

export function createAuthService(
  config: AppConfig,
  client: RayfinClientFacade
): AuthService {
  if (config.localDev || !config.fabric) {
    return new MockAuthService(client);
  }
  return new RayfinAuthService(client, config.fabric);
}
