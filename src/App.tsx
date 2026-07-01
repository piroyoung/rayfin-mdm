import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthPage } from '@/components/AuthPage';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/usecase/auth/auth-context';
import { ToastProvider } from '@/usecase/shared/ToastProvider';
import { DashboardPage } from '@/pages/DashboardPage';
import { GuidePage } from '@/pages/GuidePage';
import { AccountsPage } from '@/pages/AccountsPage';
import { RolesPage } from '@/pages/RolesPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { TerritoriesPage } from '@/pages/TerritoriesPage';
import { TerritoryRosterPage } from '@/pages/TerritoryRosterPage';
import { TerritoryAccountAssignmentsPage } from '@/pages/TerritoryAccountAssignmentsPage';
import { TerritoryRoleAssignmentsPage } from '@/pages/TerritoryRoleAssignmentsPage';
import { AssignmentsPage } from '@/pages/AssignmentsPage';
import { IngestPage } from '@/pages/IngestPage';
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
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/territories" element={<TerritoriesPage />} />
            <Route
              path="/territory-account-assignments"
              element={<TerritoryAccountAssignmentsPage />}
            />
            <Route
              path="/territory-role-assignments"
              element={<TerritoryRoleAssignmentsPage />}
            />
            <Route path="/roster" element={<TerritoryRosterPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/ingest" element={<IngestPage />} />
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
