/**
 * Outbound authentication port.
 *
 * The app depends on this interface; concrete adapters live in
 * `src/infrastructure/auth/` (a local mock and the Fabric-brokered service) and
 * are chosen once in the composition root. No view or use case may import an
 * auth SDK directly.
 */

/** Trimmed view of the authenticated user shown in the UI. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthService {
  /**
   * True when this service requires Fabric/Entra interactive sign-in. The
   * sign-in page uses it to choose its loading-state label.
   */
  readonly fabricAuthEnabled: boolean;

  /**
   * Acquire a session interactively. For Fabric this opens the broker popup and
   * must be called from a user-gesture handler.
   */
  signIn(): Promise<AuthUser>;

  signOut(): Promise<void>;

  /** Return the current session's user, or `null` if not signed in. */
  getCurrentUser(): Promise<AuthUser | null>;

  /**
   * Try to acquire a session via the embedded (iframe) Fabric flow without any
   * UI. Returns `null` when not running inside a Fabric iframe.
   */
  initEmbeddedAuth(): Promise<AuthUser | null>;
}
