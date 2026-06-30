import { describe, expect, it } from 'vitest';

import { lookupFn, matchesActive } from '@/lib/listing';

describe('matchesActive', () => {
  it('passes everything when filter is "all"', () => {
    expect(matchesActive('all', true)).toBe(true);
    expect(matchesActive('all', false)).toBe(true);
  });

  it('keeps only active rows when filter is "active"', () => {
    expect(matchesActive('active', true)).toBe(true);
    expect(matchesActive('active', false)).toBe(false);
  });

  it('keeps only inactive rows when filter is "inactive"', () => {
    expect(matchesActive('inactive', false)).toBe(true);
    expect(matchesActive('inactive', true)).toBe(false);
  });
});

describe('lookupFn', () => {
  const rows = [
    { id: 'a', code: 'FY24' },
    { id: 'b', code: 'FY25' },
  ];

  it('resolves an id to its label', () => {
    const fy = lookupFn(
      rows,
      (r) => r.id,
      (r) => r.code
    );
    expect(fy('a')).toBe('FY24');
    expect(fy('b')).toBe('FY25');
  });

  it('returns the id itself for an unknown key by default', () => {
    const fy = lookupFn(
      rows,
      (r) => r.id,
      (r) => r.code
    );
    expect(fy('zzz')).toBe('zzz');
  });

  it('uses a custom fallback for unknown keys', () => {
    const fy = lookupFn(
      rows,
      (r) => r.id,
      (r) => r.code,
      () => '—'
    );
    expect(fy('zzz')).toBe('—');
  });

  it('last write wins on duplicate keys', () => {
    const dup = lookupFn(
      [
        { id: 'a', code: 'first' },
        { id: 'a', code: 'second' },
      ],
      (r) => r.id,
      (r) => r.code
    );
    expect(dup('a')).toBe('second');
  });
});
