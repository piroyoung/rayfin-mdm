/**
 * Factory that builds the one Rayfin client for the whole app and returns it
 * wrapped in a {@link RayfinClientFacade}.
 *
 * During the staged migration this bridges to the legacy `initRayfinClient`
 * holder so newly-migrated repositories and the un-migrated `services/*` share a
 * single underlying client instance. Once every feature is migrated the legacy
 * holder can be deleted and the client constructed directly here.
 */
import {
  createRayfinClientFacade,
  type RayfinClientFacade,
} from '@/infrastructure/rayfin/client';
import { initRayfinClient } from '@/services/rayfinClient';

import type { AppConfig } from './read-config';

export function createRayfinClient(config: AppConfig): RayfinClientFacade {
  const client = initRayfinClient({
    baseUrl: config.apiUrl,
    publishableKey: config.publishableKey,
    localDev: config.localDev,
  });
  return createRayfinClientFacade(client);
}
