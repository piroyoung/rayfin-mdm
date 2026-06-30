import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthPage } from '@/components/AuthPage';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/hooks/AuthContext';
import { ToastProvider } from '@/hooks/useToast';
import { DashboardPage } from '@/pages/DashboardPage';
import { GuidePage } from '@/pages/GuidePage';
import { CustomersPage } from '@/pages/CustomersPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { TerritoriesPage } from '@/pages/TerritoriesPage';
import { AssignmentsPage } from '@/pages/AssignmentsPage';
import { DataQualityPage } from '@/pages/DataQualityPage';
import { StewardshipPage } from '@/pages/StewardshipPage';
import { ReferenceDataPage } from '@/pages/ReferenceDataPage';
import { AuditPage } from '@/pages/AuditPage';

function AuthGuard({
  children,
  requireAuth,
}: {
  children: ReactNode;
  requireAuth: boolean;
}) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) return <Navigate to="/auth" replace />;
  if (!requireAuth && isAuthenticated) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/auth"
            element={
              <AuthGuard requireAuth={false}>
                <AuthPage />
              </AuthGuard>
            }
          />
          <Route
            element={
              <AuthGuard requireAuth={true}>
                <AppLayout />
              </AuthGuard>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/territories" element={<TerritoriesPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/data-quality" element={<DataQualityPage />} />
            <Route path="/stewardship" element={<StewardshipPage />} />
            <Route path="/reference" element={<ReferenceDataPage />} />
            <Route path="/audit" element={<AuditPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
