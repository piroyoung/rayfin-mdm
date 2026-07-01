/**
 * The single place that reads `import.meta.env`. Produces a validated
 * {@link AppConfig} the rest of the composition root consumes, so no factory,
 * adapter, or component reaches for environment variables directly.
 */

/** Fabric brokered-auth configuration (structurally a `FabricAuthOptions`). */
export interface FabricConfig {
  workspaceId: string;
  projectId: string;
  fabricPortalUrl: string;
  returnOrigin: string;
}

export interface AppConfig {
  /** Backend API base URL, always terminated with a trailing slash. */
  apiUrl: string;
  /** Rayfin publishable key (a dev placeholder is used for the local backend). */
  publishableKey: string;
  /** True when the API URL targets a localhost backend. */
  localDev: boolean;
  /** Present only when brokered Fabric auth is required (non-local backends). */
  fabric?: FabricConfig;
}

function isLocalBackendUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Read and validate the app configuration from Vite env vars.
 *
 * - Localhost API URL → local-dev mode (mock auth, dev publishable key).
 * - Anything else      → Fabric mode (requires VITE_FABRIC_* vars).
 */
export function readConfig(env: ImportMetaEnv): AppConfig {
  const rawApiUrl = env.VITE_RAYFIN_API_URL || 'http://localhost:5168';
  const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl : `${rawApiUrl}/`;
  const localDev = isLocalBackendUrl(apiUrl);
  const publishableKey = env.VITE_RAYFIN_PUBLISHABLE_KEY;

  if (!publishableKey && !localDev) {
    throw new Error(
      'VITE_RAYFIN_PUBLISHABLE_KEY environment variable is required'
    );
  }

  if (localDev) {
    return { apiUrl, publishableKey: publishableKey ?? 'local-dev-key', localDev };
  }

  const workspaceId = env.VITE_FABRIC_WORKSPACE_ID;
  const projectId = env.VITE_FABRIC_ITEM_ID;
  const fabricPortalUrl = env.VITE_FABRIC_PORTAL_URL;

  if (!workspaceId || !projectId || !fabricPortalUrl) {
    throw new Error(
      'Missing required Fabric config. Set VITE_FABRIC_WORKSPACE_ID, VITE_FABRIC_ITEM_ID, and VITE_FABRIC_PORTAL_URL.'
    );
  }

  return {
    apiUrl,
    publishableKey: publishableKey as string,
    localDev,
    fabric: {
      workspaceId,
      projectId,
      fabricPortalUrl,
      returnOrigin: window.location.origin,
    },
  };
}
