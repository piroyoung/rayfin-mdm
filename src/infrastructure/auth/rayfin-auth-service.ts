import {
  ensureSignedInWithFabric,
  initEmbeddedAuth as sdkInitEmbeddedAuth,
  type FabricAuthOptions,
} from '@microsoft/rayfin-auth-provider-fabric';

import type { AuthService, AuthUser } from '@/domain/ports/auth-service';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

import { toAuthUser } from './to-auth-user';

/**
 * Production auth adapter. Wraps the Fabric brokered authentication SDK
 * (`@microsoft/rayfin-auth-provider-fabric`).
 *
 * Chosen by the composition root whenever the API URL is not localhost.
 * Requires Fabric workspace, project, and portal config, resolved once in
 * `src/infrastructure/config/`.
 */
export class RayfinAuthService implements AuthService {
  readonly fabricAuthEnabled = true;

  constructor(
    private readonly client: RayfinClientFacade,
    private readonly fabricOptions: FabricAuthOptions
  ) {}

  async signIn(): Promise<AuthUser> {
    const session = await ensureSignedInWithFabric(
      this.client.auth,
      this.fabricOptions
    );
    if (!session.isAuthenticated || !session.user) {
      throw new Error(
        'Fabric authentication completed but no session was established.'
      );
    }
    return toAuthUser(session.user);
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const session = this.client.auth.getSession();
    if (!session.isAuthenticated || !session.user) return null;
    return toAuthUser(session.user);
  }

  async initEmbeddedAuth(): Promise<AuthUser | null> {
    const session = await sdkInitEmbeddedAuth(
      this.client.auth,
      this.fabricOptions
    );
    if (!session?.isAuthenticated || !session.user) return null;
    return toAuthUser(session.user);
  }
}
