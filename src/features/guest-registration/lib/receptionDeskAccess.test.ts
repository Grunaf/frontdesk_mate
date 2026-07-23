import { describe, expect, it } from 'vitest';

import {
  coerceDeskTab,
  resolveAllowedDeskTabs,
  resolveDefaultDeskTab,
} from './receptionDeskAccess';

describe('receptionDeskAccess', () => {
  it('gives check-in tabs for empty / check-in permissions', () => {
    expect(resolveAllowedDeskTabs([])).toEqual([
      'desk',
      'plan',
      'access',
      'cash',
      'issues',
      'transfers',
      'archive',
    ]);
    expect(resolveDefaultDeskTab([])).toBe('desk');
    expect(resolveAllowedDeskTabs(['desk.check_in'])).toEqual(resolveAllowedDeskTabs([]));
  });

  it('gives only cleaning for cleaning-only staff', () => {
    expect(resolveAllowedDeskTabs(['desk.cleaning'])).toEqual(['cleaning']);
    expect(resolveDefaultDeskTab(['desk.cleaning'])).toBe('cleaning');
  });

  it('gives both when both permissions are set', () => {
    expect(resolveAllowedDeskTabs(['desk.check_in', 'desk.cleaning'])).toEqual([
      'desk',
      'plan',
      'access',
      'cash',
      'issues',
      'transfers',
      'archive',
      'cleaning',
    ]);
  });

  it('coerces forbidden deep-links away from check-in tabs', () => {
    expect(coerceDeskTab('plan', ['desk.cleaning'])).toBe('cleaning');
    expect(coerceDeskTab('cash', ['desk.cleaning'])).toBe('cleaning');
    expect(coerceDeskTab('cleaning', ['desk.check_in'])).toBe('desk');
    expect(coerceDeskTab('plan', ['desk.check_in'])).toBe('plan');
    expect(coerceDeskTab('cleaning', ['desk.check_in', 'desk.cleaning'])).toBe('cleaning');
  });
});
