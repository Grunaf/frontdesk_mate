import { describe, expect, it } from 'vitest';
import { isGuestIssueCategory } from './isGuestIssueCategory';

describe('isGuestIssueCategory', () => {
  it('accepts known categories', () => {
    expect(isGuestIssueCategory('shower')).toBe(true);
    expect(isGuestIssueCategory('other')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isGuestIssueCategory('laundry')).toBe(false);
    expect(isGuestIssueCategory('')).toBe(false);
  });
});
