/**
 * Data-quality triage lifecycle rules. Given a resolution status, decide which
 * steward actions are legal, so the view never re-derives the rule from status
 * literals. Lifecycle: open → in_progress → resolved / dismissed.
 */
import type { ResolutionStatus } from '@/domain/types';

export interface ResolutionActions {
  canStart: boolean;
  canResolve: boolean;
  canDismiss: boolean;
}

/** Steward actions allowed for an issue in the given resolution status. */
export function resolutionActions(status: ResolutionStatus): ResolutionActions {
  const active = status === 'open' || status === 'in_progress';
  return {
    canStart: status === 'open',
    canResolve: active,
    canDismiss: active,
  };
}
