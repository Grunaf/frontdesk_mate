import { describe, expect, it } from 'vitest';

import { formatGuestDisplayName } from './formatGuestDisplayName';

describe('formatGuestDisplayName', () => {
  it('joins first and last', () => {
    expect(formatGuestDisplayName('Ada', 'Lovelace')).toBe('Ada Lovelace');
  });

  it('falls back to display name then Guest', () => {
    expect(formatGuestDisplayName(null, null, 'Walk-in')).toBe('Walk-in');
    expect(formatGuestDisplayName('', '', '')).toBe('Guest');
  });
});
