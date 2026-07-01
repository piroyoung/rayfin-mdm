/**
 * Anti-corruption mapper: translate the raw Rayfin session user shape into the
 * app's trimmed {@link AuthUser} view model. Kept at the auth boundary so the
 * SDK's user shape never leaks inward.
 */
import type { AuthUser } from '@/domain/ports/auth-service';

export function toAuthUser(user: {
  id: string;
  email: string;
  name?: string;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name || user.email.split('@')[0],
  };
}
