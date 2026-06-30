/** App shell: sidebar navigation, header, and current-actor wiring. */
import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '@/hooks/AuthContext';
import { setCurrentActor } from '@/services/session';
import { initials } from '@/lib/format';
import { cn } from '@/lib/format';
import { Button, Tooltip } from '@/components/ui';

type IconName =
  | 'guide'
  | 'dashboard'
  | 'customers'
  | 'products'
  | 'employees'
  | 'territories'
  | 'assignments'
  | 'ingest'
  | 'dataQuality'
  | 'stewardship'
  | 'reference'
  | 'audit';

const ICONS: Record<IconName, string> = {
  guide:
    'M12 22a10 10 0 110-20 10 10 0 010 20zM9.5 9a2.5 2.5 0 014.9.7c0 1.7-2.5 2.5-2.5 2.5M12 16h.01',
  dashboard: 'M3 12h7V3H3v9zm0 9h7v-7H3v7zm11 0h7V12h-7v9zm0-18v7h7V3h-7z',
  customers:
    'M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6-4a3 3 0 10-2-5.24M5 11a3 3 0 002-5.24',
  products:
    'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 4v10M4 7v10l8 4',
  employees:
    'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  territories:
    'M9 20l-5.4 1.8a1 1 0 01-1.3-.95V6.4a1 1 0 01.68-.95L9 3.5m0 16.5l6-2.5m-6 2.5V3.5m6 14l5.4 1.8a1 1 0 001.3-.95V3.6a1 1 0 00-.68-.95L15 1.5m0 16v-16m0 0L9 3.5',
  assignments:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  dataQuality:
    'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  ingest:
    'M12 3v12m0 0l-4-4m4 4l4-4M5 21h14a2 2 0 002-2v-2a2 2 0 00-2-2h-2',
  stewardship: 'M9 12l2 2 4-4m-6 8a9 9 0 110-18 9 9 0 010 18z',
  reference:
    'M4 6h16M4 12h16M4 18h10M19 16l2 2-2 2',
  audit:
    'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
};

function Icon({ name }: { name: IconName }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

const NAV: Array<{ to: string; label: string; icon: IconName; end?: boolean }> =
  [
    { to: '/guide', label: 'MDMとは？', icon: 'guide' },
    { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/customers', label: 'Customers', icon: 'customers' },
    { to: '/products', label: 'Products', icon: 'products' },
    { to: '/employees', label: 'Employees', icon: 'employees' },
    { to: '/territories', label: 'Territories', icon: 'territories' },
    { to: '/assignments', label: 'Assignments', icon: 'assignments' },
    { to: '/ingest', label: 'Ingest', icon: 'ingest' },
    { to: '/data-quality', label: 'Data Quality', icon: 'dataQuality' },
    { to: '/stewardship', label: 'Stewardship', icon: 'stewardship' },
    { to: '/reference', label: 'Reference Data', icon: 'reference' },
    { to: '/audit', label: 'Audit Log', icon: 'audit' },
  ];

export function AppLayout() {
  const { user, signOut } = useAuth();

  useEffect(() => {
    setCurrentActor(user);
  }, [user]);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white">
            M
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">MDM</p>
            <p className="text-xs text-gray-500">Master Data Management</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {initials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800">
                {user?.name ?? 'Signed in'}
              </p>
              <p className="truncate text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <Tooltip
            label="MDM からサインアウトします"
            side="top"
            className="mt-1 w-full"
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </Tooltip>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white">
              M
            </div>
            <span className="text-sm font-semibold">MDM</span>
          </div>
          <Tooltip label="MDM からサインアウトします" side="bottom">
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </Tooltip>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2 py-2 md:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
