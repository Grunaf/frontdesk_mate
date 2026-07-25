import { describe, expect, it } from 'vitest';

import {
  coerceDeskTab,
  isBookingsContextTab,
  resolveActivePrimaryNav,
  resolveAllowedDeskTabs,
  resolveBottomNavItems,
  resolveBookingsContextTabs,
  resolveDefaultDeskTab,
  resolveDeskTabForPrimaryNav,
  resolveMoreBadgeCount,
  resolveMoreMenuTabs,
  resolvePrimaryNavForDeskTab,
  shouldShowBookingsContextTabs,
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
      'schedule',
    ]);
    expect(resolveDefaultDeskTab([])).toBe('desk');
    expect(resolveAllowedDeskTabs(['desk.check_in'])).toEqual(resolveAllowedDeskTabs([]));
  });

  it('gives only cleaning for cleaning-only staff', () => {
    expect(resolveAllowedDeskTabs(['desk.cleaning'])).toEqual(['cleaning', 'schedule']);
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
      'schedule',
    ]);
  });

  it('coerces forbidden deep-links away from check-in tabs', () => {
    expect(coerceDeskTab('plan', ['desk.cleaning'])).toBe('cleaning');
    expect(coerceDeskTab('cash', ['desk.cleaning'])).toBe('cleaning');
    expect(coerceDeskTab('cleaning', ['desk.check_in'])).toBe('desk');
    expect(coerceDeskTab('plan', ['desk.check_in'])).toBe('plan');
    expect(coerceDeskTab('cleaning', ['desk.check_in', 'desk.cleaning'])).toBe('cleaning');
  });

  it('exposes Bookings context and More menu groups for check-in', () => {
    expect(resolveBookingsContextTabs(['desk.check_in'])).toEqual(['plan', 'access', 'cash']);
    expect(resolveMoreMenuTabs(['desk.check_in'])).toEqual([
      'schedule',
      'issues',
      'transfers',
      'archive',
    ]);
    expect(resolveMoreMenuTabs(['desk.check_in', 'desk.cleaning'])).toEqual([
      'schedule',
      'issues',
      'transfers',
      'archive',
      'cleaning',
    ]);
    expect(resolveBookingsContextTabs(['desk.cleaning'])).toEqual([]);
    // Single More item (schedule) is promoted to bottom nav — More list empty.
    expect(resolveMoreMenuTabs(['desk.cleaning'])).toEqual([]);
  });

  it('resolves bottom nav by role', () => {
    expect(resolveBottomNavItems(['desk.check_in'])).toEqual(['today', 'bookings', 'more']);
    expect(resolveBottomNavItems(['desk.cleaning'])).toEqual(['cleaning', 'schedule']);
    expect(resolveBottomNavItems(['desk.check_in', 'desk.cleaning'])).toEqual([
      'today',
      'bookings',
      'more',
    ]);
  });

  it('scopes More badge to visible More tabs only', () => {
    expect(resolveMoreBadgeCount(['desk.check_in'], 2, 1)).toBe(3);
    expect(resolveMoreBadgeCount(['desk.check_in', 'desk.cleaning'], 2, 1)).toBe(3);
    // Cleaning-only: Issues/Transfers not in More (promoted schedule) → no badge.
    expect(resolveMoreBadgeCount(['desk.cleaning'], 5, 3)).toBe(0);
  });

  it('maps desk tabs to primary nav and bookings context visibility', () => {
    expect(resolvePrimaryNavForDeskTab('desk', ['desk.check_in'])).toBe('today');
    expect(resolvePrimaryNavForDeskTab('plan', ['desk.check_in'])).toBe('bookings');
    expect(resolvePrimaryNavForDeskTab('issues', ['desk.check_in'])).toBe('more');
    expect(resolvePrimaryNavForDeskTab('schedule', ['desk.check_in'])).toBe('more');
    expect(resolvePrimaryNavForDeskTab('schedule', ['desk.cleaning'])).toBe('schedule');
    expect(resolvePrimaryNavForDeskTab('cleaning', ['desk.cleaning'])).toBe('cleaning');
    expect(shouldShowBookingsContextTabs('plan')).toBe(true);
    expect(shouldShowBookingsContextTabs('desk')).toBe(false);
    expect(isBookingsContextTab('cash')).toBe(true);
  });

  it('resolves bottom-nav taps to desk tabs (More → menu surface)', () => {
    expect(resolveDeskTabForPrimaryNav('today', ['desk.check_in'])).toBe('desk');
    expect(resolveDeskTabForPrimaryNav('bookings', ['desk.check_in'], 'cash')).toBe('cash');
    expect(resolveDeskTabForPrimaryNav('bookings', ['desk.check_in'], null)).toBe('plan');
    expect(resolveDeskTabForPrimaryNav('more', ['desk.check_in'])).toBeNull();
    expect(resolveDeskTabForPrimaryNav('cleaning', ['desk.cleaning'])).toBe('cleaning');
    expect(resolveDeskTabForPrimaryNav('schedule', ['desk.cleaning'])).toBe('schedule');
  });

  it('keeps More selected while the menu is open', () => {
    expect(
      resolveActivePrimaryNav({
        deskTab: 'plan',
        moreMenuOpen: true,
        permissions: ['desk.check_in'],
      })
    ).toBe('more');
    expect(
      resolveActivePrimaryNav({
        deskTab: 'issues',
        moreMenuOpen: false,
        permissions: ['desk.check_in'],
      })
    ).toBe('more');
  });
});
