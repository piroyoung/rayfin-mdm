/** Unit tests for the pure assignment approval state machine. */
import { describe, expect, it } from 'vitest';
import {
  assertTransition,
  canTransition,
  isPublishableStatus,
  nextStatuses,
  workflowActions,
} from '@/domain/assignmentWorkflow';

describe('assignment state machine', () => {
  it('permits the canonical forward path', () => {
    expect(canTransition('draft', 'submitted')).toBe(true);
    expect(canTransition('submitted', 'approved')).toBe(true);
    expect(canTransition('approved', 'active')).toBe(true);
    expect(canTransition('active', 'retired')).toBe(true);
  });

  it('permits rework back to draft from submitted/approved only', () => {
    expect(canTransition('submitted', 'draft')).toBe(true);
    expect(canTransition('approved', 'draft')).toBe(true);
    expect(canTransition('active', 'draft')).toBe(false);
  });

  it('rejects skips and moves out of a terminal state', () => {
    expect(canTransition('draft', 'approved')).toBe(false);
    expect(canTransition('draft', 'active')).toBe(false);
    expect(canTransition('retired', 'active')).toBe(false);
    expect(nextStatuses('retired')).toEqual([]);
  });

  it('assertTransition throws on an illegal hop but is a no-op for identity', () => {
    expect(() => assertTransition('draft', 'active')).toThrow(
      /Invalid assignment transition/
    );
    expect(() => assertTransition('approved', 'approved')).not.toThrow();
  });

  it('only approved/active are publishable', () => {
    expect(isPublishableStatus('approved')).toBe(true);
    expect(isPublishableStatus('active')).toBe(true);
    expect(isPublishableStatus('draft')).toBe(false);
    expect(isPublishableStatus('submitted')).toBe(false);
    expect(isPublishableStatus('retired')).toBe(false);
  });

  it('exposes labelled UI actions for each status', () => {
    expect(workflowActions('draft').map((a) => a.label)).toEqual(['Submit']);
    expect(workflowActions('submitted').map((a) => a.label)).toEqual([
      'Approve',
      'Send back',
    ]);
    expect(workflowActions('active').map((a) => a.label)).toEqual(['Retire']);
    expect(workflowActions('retired')).toEqual([]);
  });
});
