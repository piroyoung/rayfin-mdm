/**
 * Facade over {@link RayfinClient}.
 *
 * The rest of infrastructure depends on this narrow contract instead of the raw
 * SDK surface: repositories touch {@link RayfinClientFacade.data} and auth
 * adapters touch {@link RayfinClientFacade.auth}. Keeping the surface small is
 * what lets the app treat Rayfin as one replaceable boundary.
 */
import type { RayfinClient } from '@microsoft/rayfin-client';

import type { MdmSchema } from '../../../rayfin/data/schema';

/** Typed `client.data.<Entity>` GraphQL proxies — the only data surface repositories use. */
export type RayfinData = RayfinClient<MdmSchema>['data'];

/** Auth surface used by the auth adapters and the session-backed actor context. */
export type RayfinAuth = RayfinClient<MdmSchema>['auth'];

export interface RayfinClientFacade {
  readonly data: RayfinData;
  readonly auth: RayfinAuth;
}

/** Wrap a concrete {@link RayfinClient} in the narrow facade the app depends on. */
export function createRayfinClientFacade(
  client: RayfinClient<MdmSchema>
): RayfinClientFacade {
  return {
    get data() {
      return client.data;
    },
    get auth() {
      return client.auth;
    },
  };
}
