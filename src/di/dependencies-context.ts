/**
 * Dependency-graph context and hook, kept JSX-free and separate from
 * {@link DependenciesProvider} so the context identity stays stable and the file
 * exports only a hook/value (satisfies react-refresh).
 */
import { createContext, useContext } from 'react';

import type { AppDependencies } from './dependencies';

export const DependenciesContext = createContext<AppDependencies | null>(null);

/** Read the injected dependency graph. Throws if used outside the provider. */
export function useDependencies(): AppDependencies {
  const deps = useContext(DependenciesContext);
  if (!deps) {
    throw new Error(
      'useDependencies must be used within a DependenciesProvider.'
    );
  }
  return deps;
}
