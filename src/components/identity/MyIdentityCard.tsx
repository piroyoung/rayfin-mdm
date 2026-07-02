/**
 * "This is me" — links the signed-in Entra user to their {@link Employee} row.
 *
 * Every employee is a user in this tenant, so on sign-in we resolve the current
 * user to their master record by Entra oid / upn / email and offer the one
 * obvious next action: link (back-fill the durable oid) or auto-provision a new
 * employee. All resolution and orchestration lives in `useMyIdentity`; this card
 * only renders the view-model. Shown on the dashboard.
 */
import { Link } from 'react-router-dom';

import { Badge, Button, Card } from '@/components/shared';
import { initials } from '@/lib/format';
import { useMyIdentity } from '@/usecase/identity/use-my-identity';

export function MyIdentityCard() {
  const { user, match, loading, busy, onLink, onProvision } = useMyIdentity();

  if (!user || loading || !match) return null;

  const status =
    match.kind === 'linked' ? (
      <Badge tone="green">Linked</Badge>
    ) : match.kind === 'unlinked' ? (
      <Badge tone="amber">Record found</Badge>
    ) : (
      <Badge tone="blue">Not linked</Badge>
    );

  const detail =
    match.kind === 'linked' ? (
      <>
        You&apos;re linked to employee{' '}
        <span className="font-medium text-gray-900">
          {match.employee.displayName}
        </span>
        .
      </>
    ) : match.kind === 'unlinked' ? (
      <>
        Found{' '}
        <span className="font-medium text-gray-900">
          {match.employee.displayName}
        </span>{' '}
        by email — link it to store your durable Entra ID.
      </>
    ) : (
      <>No employee record yet for your account.</>
    );

  return (
    <Card className="flex flex-wrap items-center gap-4 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
        {initials(user.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-gray-900">
            {user.name}
          </p>
          {status}
        </div>
        <p className="truncate text-xs text-gray-500">{user.email}</p>
        <p className="mt-1 text-xs text-gray-600">{detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {match.kind === 'linked' && (
          <Link
            to="/employees"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            View record →
          </Link>
        )}
        {match.kind === 'unlinked' && (
          <Button
            variant="primary"
            size="sm"
            loading={busy}
            onClick={() => onLink(match.employee)}
          >
            Link my Entra ID
          </Button>
        )}
        {match.kind === 'none' && (
          <Button
            variant="primary"
            size="sm"
            loading={busy}
            onClick={onProvision}
          >
            Create my employee record
          </Button>
        )}
      </div>
    </Card>
  );
}
