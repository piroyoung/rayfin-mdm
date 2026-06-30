import { describe, expect, it } from 'vitest';

import {
  ASSIGNMENT_STATUS_META,
  ISSUE_TYPE_META,
  PUBLISHABLE_ASSIGNMENT_STATUSES,
  RESOLUTION_STATUS_META,
  SEVERITY_META,
  labelledMeta,
  tonedMeta,
} from '@/domain/types';
import type { AssignmentStatus } from '@/domain/types';

/**
 * Phase 1 guard: the territory-assignment enums expose complete, well-toned
 * metadata maps, and the fallback accessors keep working for the open
 * `issueType` code list (rules grow over time, so unknown codes must not throw).
 */
describe('territory-assignment metadata', () => {
  it('covers every assignment lifecycle state with a tone', () => {
    const states: AssignmentStatus[] = [
      'draft',
      'submitted',
      'approved',
      'active',
      'retired',
    ];
    for (const s of states) {
      expect(ASSIGNMENT_STATUS_META[s].label).toBeTruthy();
      expect(ASSIGNMENT_STATUS_META[s].tone).toBeTruthy();
    }
  });

  it('only publishes approved/active assignments downstream', () => {
    expect(PUBLISHABLE_ASSIGNMENT_STATUSES.has('approved')).toBe(true);
    expect(PUBLISHABLE_ASSIGNMENT_STATUSES.has('active')).toBe(true);
    expect(PUBLISHABLE_ASSIGNMENT_STATUSES.has('draft')).toBe(false);
    expect(PUBLISHABLE_ASSIGNMENT_STATUSES.has('submitted')).toBe(false);
    expect(PUBLISHABLE_ASSIGNMENT_STATUSES.has('retired')).toBe(false);
  });

  it('tones severities and resolution states', () => {
    expect(tonedMeta(SEVERITY_META, 'critical').tone).toBe('red');
    expect(tonedMeta(RESOLUTION_STATUS_META, 'resolved').tone).toBe('green');
  });

  it('labels known issue types and humanizes unknown ones', () => {
    expect(labelledMeta(ISSUE_TYPE_META, 'ROLE_MISMATCH').label).toBe(
      'Assigned role differs from home role'
    );
    // An unknown future rule code must still render a non-empty label, not throw.
    const unknown = labelledMeta(ISSUE_TYPE_META, 'SOME_NEW_RULE' as never);
    expect(unknown.label).toBe('SOME NEW RULE');
    expect(() => labelledMeta(ISSUE_TYPE_META, 'x' as never)).not.toThrow();
  });
});
