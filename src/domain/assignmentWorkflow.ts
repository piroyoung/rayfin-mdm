/**
 * Pure assignment approval state machine.
 *
 *   DRAFT → SUBMITTED → APPROVED → ACTIVE → RETIRED
 *
 * SUBMITTED and APPROVED can be sent back to DRAFT for rework. Only APPROVED and
 * ACTIVE rows are publishable downstream (see {@link PUBLISHABLE_ASSIGNMENT_STATUSES}).
 * No Rayfin dependency — guards are unit-tested in isolation.
 */
import {
  PUBLISHABLE_ASSIGNMENT_STATUSES,
  type AssignmentStatus,
} from './types';

/** Canonical lifecycle order, used for display/sorting. */
export const ASSIGNMENT_STATUS_ORDER: readonly AssignmentStatus[] = [
  'draft',
  'submitted',
  'approved',
  'active',
  'retired',
];

/** Allowed forward / rework transitions out of each status. */
export const ASSIGNMENT_TRANSITIONS: Record<
  AssignmentStatus,
  readonly AssignmentStatus[]
> = {
  draft: ['submitted'],
  submitted: ['approved', 'draft'],
  approved: ['active', 'draft'],
  active: ['retired'],
  retired: [],
};

export function nextStatuses(from: AssignmentStatus): readonly AssignmentStatus[] {
  return ASSIGNMENT_TRANSITIONS[from] ?? [];
}

export function canTransition(
  from: AssignmentStatus,
  to: AssignmentStatus
): boolean {
  return nextStatuses(from).includes(to);
}

/** Throw when a transition is not permitted by the state machine. */
export function assertTransition(
  from: AssignmentStatus,
  to: AssignmentStatus
): void {
  if (from === to) return;
  if (!canTransition(from, to)) {
    throw new Error(`Invalid assignment transition: ${from} → ${to}`);
  }
}

/** APPROVED / ACTIVE — the only statuses exposed to downstream consumers. */
export function isPublishableStatus(status: AssignmentStatus): boolean {
  return PUBLISHABLE_ASSIGNMENT_STATUSES.has(status);
}

export type WorkflowVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface WorkflowAction {
  to: AssignmentStatus;
  label: string;
  variant: WorkflowVariant;
}

/** UI-facing labelled actions for the controls available on a row. */
export function workflowActions(from: AssignmentStatus): WorkflowAction[] {
  return nextStatuses(from).map((to) => {
    if (to === 'draft') {
      return { to, label: 'Send back', variant: 'ghost' as const };
    }
    if (to === 'submitted') {
      return { to, label: 'Submit', variant: 'primary' as const };
    }
    if (to === 'approved') {
      return { to, label: 'Approve', variant: 'primary' as const };
    }
    if (to === 'active') {
      return { to, label: 'Activate', variant: 'primary' as const };
    }
    return { to, label: 'Retire', variant: 'danger' as const };
  });
}
