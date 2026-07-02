import { createRoot } from 'react-dom/client';

import App from '@/App';
import { ErrorBoundary, FatalError } from '@/components/ErrorBoundary';
import { DependenciesProvider } from '@/di/DependenciesProvider';
import { createAuthService } from '@/infrastructure/config/create-auth-service';
import { createDependencies } from '@/infrastructure/config/create-dependencies';
import { createRayfinClient } from '@/infrastructure/config/create-rayfin-client';
import { readConfig } from '@/infrastructure/config/read-config';
import { AuthProvider } from '@/usecase/auth/AuthProvider';

import './main.css';

const root = createRoot(document.getElementById('root')!);

try {
  // Composition root: read config → build the one client → pick adapters →
  // assemble the dependency graph → inject through React context.
  const config = readConfig(import.meta.env);
  const client = createRayfinClient(config);
  const authService = createAuthService(config, client);
  const dependencies = createDependencies(client);

  root.render(
    <ErrorBoundary>
      <DependenciesProvider dependencies={dependencies}>
        <AuthProvider authService={authService}>
          <App />
        </AuthProvider>
      </DependenciesProvider>
    </ErrorBoundary>
  );
} catch (err) {
  // Config/init failures happen before React mounts — render the panel directly.
  console.error('Bootstrap failed:', err);
  root.render(<FatalError error={err} />);
}
