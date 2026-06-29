import { createRoot } from 'react-dom/client';

import App from '@/App';
import { ErrorBoundary, FatalError } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/hooks/AuthContext';
import { bootstrapAuth } from '@/services/bootstrap';

import './main.css';

const root = createRoot(document.getElementById('root')!);

try {
  const authService = bootstrapAuth();
  root.render(
    <ErrorBoundary>
      <AuthProvider authService={authService}>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  );
} catch (err) {
  // Config/init failures happen before React mounts — render the panel directly.
  console.error('Bootstrap failed:', err);
  root.render(<FatalError error={err} />);
}
