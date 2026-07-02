/**
 * Composition glue that keeps the injected {@link ActorSink} in sync with the
 * signed-in user. Renders nothing; mounted once under the dependency + auth
 * providers so the legacy backlog seam is fed without any presentational
 * component reaching into `services/session`. Retire it with the last legacy
 * service.
 */
import { useEffect } from 'react';

import { useDependencies } from '@/di/dependencies-context';
import { useAuth } from '@/usecase/auth/auth-context';

export function LegacyActorSync() {
  const { actorSink } = useDependencies();
  const { user } = useAuth();

  useEffect(() => {
    actorSink.set(user);
  }, [actorSink, user]);

  return null;
}
