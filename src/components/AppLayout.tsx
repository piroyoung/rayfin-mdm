/** App shell: sidebar navigation, header, and current-actor wiring. */
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks/AuthContext';
import { setCurrentActor } from '@/services/session';
import { initials } from '@/lib/format';
import { cn } from '@/lib/format';
import { Button, Tooltip } from '@/components/ui';

type IconName =
  | 'guide'
  | 'dashboard'
  | 'accounts'
  | 'employees'
  | 'territories'
  | 'roster'
  | 'assignments'
  | 'ingest'
  | 'dataQuality'
  | 'stewardship'
  | 'reference'
  | 'audit'
  | 'role'
  | 'tables';

const ICONS: Record<IconName, string> = {
  guide:
    'M12 22a10 10 0 110-20 10 10 0 010 20zM9.5 9a2.5 2.5 0 014.9.7c0 1.7-2.5 2.5-2.5 2.5M12 16h.01',
  dashboard: 'M3 12h7V3H3v9zm0 9h7v-7H3v7zm11 0h7V12h-7v9zm0-18v7h7V3h-7z',
  accounts:
    'M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6-4a3 3 0 10-2-5.24M5 11a3 3 0 002-5.24',
  employees:
    'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  territories:
    'M9 20l-5.4 1.8a1 1 0 01-1.3-.95V6.4a1 1 0 01.68-.95L9 3.5m0 16.5l6-2.5m-6 2.5V3.5m6 14l5.4 1.8a1 1 0 001.3-.95V3.6a1 1 0 00-.68-.95L15 1.5m0 16v-16m0 0L9 3.5',
  roster:
    'M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zM7 9h.01M17 9h.01',
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
  role: 'M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7l7-4z',
  tables: 'M3 4h18v4H3zM3 10h18v4H3zM3 16h18v4H3z',
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

interface NavLeaf {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}
interface NavGroup {
  group: string;
  icon: IconName;
  children: NavLeaf[];
}
type NavEntry = NavLeaf | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'group' in entry;
}

/**
 * Workflow pages stay at the top level; the master tables (one page per
 * Rayfin entity, labelled with the table name) are tucked into a single
 * collapsible group so the sidebar stays scannable.
 */
const NAV: NavEntry[] = [
  { to: '/guide', label: 'MDMとは？', icon: 'guide' },
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/roster', label: 'Territory Roster', icon: 'roster' },
  { to: '/assignments', label: 'Assignments', icon: 'assignments' },
  {
    group: 'Master Tables',
    icon: 'tables',
    children: [
      { to: '/roles', label: 'Role', icon: 'role' },
      { to: '/accounts', label: 'Account', icon: 'accounts' },
      { to: '/employees', label: 'Employee', icon: 'employees' },
      { to: '/territories', label: 'Territory', icon: 'territories' },
      {
        to: '/territory-account-assignments',
        label: 'TerritoryAccountAssignment',
        icon: 'assignments',
      },
      {
        to: '/territory-role-assignments',
        label: 'TerritoryRoleAssignment',
        icon: 'roster',
      },
    ],
  },
  { to: '/ingest', label: 'Ingest', icon: 'ingest' },
  { to: '/data-quality', label: 'Data Quality', icon: 'dataQuality' },
  { to: '/stewardship', label: 'Stewardship', icon: 'stewardship' },
  { to: '/reference', label: 'Reference Data', icon: 'reference' },
  { to: '/audit', label: 'Audit Log', icon: 'audit' },
];

/** True when one of a group's children is the active route. */
function useChildActive(children: NavLeaf[]): boolean {
  const { pathname } = useLocation();
  return children.some(
    (c) => pathname === c.to || pathname.startsWith(`${c.to}/`)
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('transition-transform', open && 'rotate-90')}
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function NavLeafLink({ item, nested }: { item: NavLeaf; nested?: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          nested && 'pl-9 text-[13px]',
          isActive
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )
      }
    >
      <Icon name={item.icon} />
      <span
        className={nested ? 'min-w-0 leading-tight [overflow-wrap:anywhere]' : undefined}
      >
        {item.label}
      </span>
    </NavLink>
  );
}

function NavGroupSection({ entry }: { entry: NavGroup }) {
  const childActive = useChildActive(entry.children);
  const [open, setOpen] = useState(childActive);
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          childActive
            ? 'text-indigo-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )}
      >
        <Icon name={entry.icon} />
        <span className="flex-1 text-left">{entry.group}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {entry.children.map((c) => (
            <NavLeafLink key={c.to} item={c} nested />
          ))}
        </div>
      )}
    </div>
  );
}

function MobilePill({
  to,
  end,
  label,
}: {
  to: string;
  end?: boolean;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium',
          isActive
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-gray-600 hover:bg-gray-100'
        )
      }
    >
      {label}
    </NavLink>
  );
}

function MobileNav() {
  const leaves = NAV.filter((e): e is NavLeaf => !isGroup(e));
  const group = NAV.find(isGroup);
  const childActive = useChildActive(group?.children ?? []);
  const [open, setOpen] = useState(childActive);
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  return (
    <nav className="flex flex-col gap-2 border-b border-gray-200 bg-white px-2 py-2 md:hidden">
      <div className="flex gap-1 overflow-x-auto">
        {leaves.map((item) => (
          <MobilePill key={item.to} to={item.to} end={item.end} label={item.label} />
        ))}
        {group && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium',
              childActive
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {group.group}
            <Chevron open={open} />
          </button>
        )}
      </div>
      {group && open && (
        <div className="flex flex-wrap gap-1">
          {group.children.map((c) => (
            <MobilePill key={c.to} to={c.to} label={c.label} />
          ))}
        </div>
      )}
    </nav>
  );
}

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
          {NAV.map((entry) =>
            isGroup(entry) ? (
              <NavGroupSection key={entry.group} entry={entry} />
            ) : (
              <NavLeafLink key={entry.to} item={entry} />
            )
          )}
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
        <MobileNav />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
