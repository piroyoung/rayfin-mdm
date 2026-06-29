/** App shell: sidebar navigation, header, and current-actor wiring. */
import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '@/hooks/AuthContext';
import { setCurrentActor } from '@/services/session';
import { initials } from '@/lib/format';
import { cn } from '@/lib/format';
import { Button } from '@/components/ui';

type IconName =
  | 'dashboard'
  | 'customers'
  | 'products'
  | 'stewardship'
  | 'reference'
  | 'audit';

const ICONS: Record<IconName, string> = {
  dashboard: 'M3 12h7V3H3v9zm0 9h7v-7H3v7zm11 0h7V12h-7v9zm0-18v7h7V3h-7z',
  customers:
    'M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6-4a3 3 0 10-2-5.24M5 11a3 3 0 002-5.24',
  products:
    'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 4v10M4 7v10l8 4',
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
    { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/customers', label: 'Customers', icon: 'customers' },
    { to: '/products', label: 'Products', icon: 'products' },
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
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start"
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
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
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
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
