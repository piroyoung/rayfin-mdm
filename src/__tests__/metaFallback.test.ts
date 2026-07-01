import { describe, expect, it } from 'vitest';

import {
  AUDIT_ACTION_META,
  RECORD_STATUS_META,
  SEGMENT_META,
  humanizeToken,
  labelledMeta,
  tonedMeta,
} from '@/domain/types';

/**
 * Regression guard for the embedded white-screen bug: the persistent Fabric
 * backend can return enum values outside the current union, and a direct
 * `MAP[value].tone` access would throw during render and blank the whole app.
 * These accessors must always return usable metadata instead of throwing.
 */
describe('metadata fallback accessors', () => {
  it('returns the mapped entry for known keys', () => {
    expect(tonedMeta(AUDIT_ACTION_META, 'create')).toEqual({
      label: 'Create',
      tone: 'green',
    });
    expect(labelledMeta(SEGMENT_META, 'enterprise').label).toBe('Enterprise');
  });

  it('falls back to a neutral badge for unknown keys (no throw)', () => {
    // Cast simulates a legacy/unknown value coming back from the backend.
    const unknown = 'legacy_login' as never;
    expect(() => tonedMeta(RECORD_STATUS_META, unknown)).not.toThrow();
    const meta = tonedMeta(RECORD_STATUS_META, unknown);
    expect(meta.tone).toBe('gray');
    expect(meta.label).toBe('Legacy login');
    expect(labelledMeta(SEGMENT_META, unknown).label).toBe('Legacy login');
  });

  it('humanizes tokens and handles empty values', () => {
    expect(humanizeToken('status_change')).toBe('Status change');
    expect(humanizeToken(undefined)).toBe('—');
    expect(humanizeToken('')).toBe('—');
  });
});
