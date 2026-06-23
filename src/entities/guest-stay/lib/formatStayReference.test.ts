import { describe, expect, it } from 'vitest';
import { formatStayReference } from './formatStayReference';

describe('formatStayReference', () => {
  it('returns last 6 chars uppercased', () => {
    expect(formatStayReference('00000000-0000-0000-0000-0000123456')).toBe('123456');
  });

  it('returns null for short ids', () => {
    expect(formatStayReference('abc')).toBeNull();
  });
});
