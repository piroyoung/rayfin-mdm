import type { ReactNode } from 'react';

import type { AppDependencies } from './dependencies';
import { DependenciesContext } from './dependencies-context';

/**
 * Provides the injected {@link AppDependencies} graph to the React tree. The
 * graph is built once in the composition root and passed in as a prop — this
 * provider is the single Context through which the view reads outbound ports.
 */
export function DependenciesProvider({
  dependencies,
  children,
}: {
  dependencies: AppDependencies;
  children: ReactNode;
}) {
  return (
    <DependenciesContext.Provider value={dependencies}>
      {children}
    </DependenciesContext.Provider>
  );
}
