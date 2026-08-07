import { describe, expect, it } from 'vitest';

import {
  coerceDeskTab,
  groupMoreMenuTabs,
  resolveActivePrimaryNav,
  resolveAllowedDeskTabs,
  resolveBottomNavItems,
  resolveDefaultDeskTab,
  resolveDeskTabForPrimaryNav,
  resolveMoreBadgeCount,
  resolveMoreMenuTabs,
  resolvePrimaryNavForDeskTab,
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
      'booking-inbox',
      'archive',
      'schedule',
    ]);
    expect(resolveDefaultDeskTab([])).toBe('desk');
    expect(resolveAllowedDeskTabs(['desk.check_in'])).toEqual(resolveAllowedDeskTabs([]));
  });

  it('gives cleaning + wash + schedule for cleaning-only staff', () => {
    expect(resolveAllowedDeskTabs(['desk.cleaning'])).toEqual([
      'cleaning',
      'wash',
      'schedule',
    ]);
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
      'booking-inbox',
      'archive',
      'cleaning',
      'wash',
      'schedule',
    ]);
  });

  it('coerces forbidden deep-links away from check-in tabs', () => {
    expect(coerceDeskTab('plan', ['desk.cleaning'])).toBe('cleaning');
    expect(coerceDeskTab('cash', ['desk.cleaning'])).toBe('cleaning');
    expect(coerceDeskTab('cleaning', ['desk.check_in'])).toBe('desk');
    expect(coerceDeskTab('plan', ['desk.check_in'])).toBe('plan');
    expect(coerceDeskTab('wash', ['desk.cleaning'])).toBe('wash');
    expect(coerceDeskTab('wash', ['desk.check_in'])).toBe('desk');
    expect(coerceDeskTab('cleaning', ['desk.check_in', 'desk.cleaning'])).toBe('cleaning');
  });

  it('exposes More menu groups including Access/Cash and optional Wash (Plan via Bookings)', () => {
    expect(resolveMoreMenuTabs(['desk.check_in'])).toEqual([
      'access',
      'cash',
      'schedule',
      'issues',
      'transfers',
    ]);
    expect(resolveMoreMenuTabs(['desk.check_in', 'desk.cleaning'], { showWash: true })).toEqual([
      'access',
      'cash',
      'schedule',
      'issues',
      'transfers',
      'cleaning',
      'wash',
    ]);
    expect(resolveMoreMenuTabs(['desk.check_in', 'desk.cleaning'])).toEqual([
      'access',
      'cash',
      'schedule',
      'issues',
      'transfers',
      'cleaning',
    ]);
    // Single More item (schedule) is promoted to bottom nav — More list empty.
    expect(resolveMoreMenuTabs(['desk.cleaning'])).toEqual([]);
    // Wash + schedule → More stays (no single-item promotion).
    expect(resolveMoreMenuTabs(['desk.cleaning'], { showWash: true })).toEqual([
      'schedule',
      'wash',
    ]);
  });

  it('groups More tabs into Stay → Inbox → Housekeeping → Other', () => {
    expect(groupMoreMenuTabs([])).toEqual([]);
    expect(
      groupMoreMenuTabs([
        'wash',
        'access',
        'issues',
        'schedule',
        'cash',
        'cleaning',
        'transfers',
      ])
    ).toEqual([
      { id: 'stay', label: 'Stay', items: ['access', 'cash'] },
      {
        id: 'inbox',
        label: 'Inbox',
        items: ['issues', 'transfers'],
      },
      { id: 'housekeeping', label: 'Housekeeping', items: ['cleaning', 'wash'] },
      { id: 'other', label: 'Other', items: ['schedule'] },
    ]);
    expect(groupMoreMenuTabs(['schedule', 'wash'])).toEqual([
      { id: 'housekeeping', label: 'Housekeeping', items: ['wash'] },
      { id: 'other', label: 'Other', items: ['schedule'] },
    ]);
    expect(groupMoreMenuTabs(['access'])).toEqual([
      { id: 'stay', label: 'Stay', items: ['access'] },
    ]);
  });

  it('resolves bottom nav by role', () => {
    expect(resolveBottomNavItems(['desk.check_in'])).toEqual(['today', 'bookings', 'more']);
    expect(resolveBottomNavItems(['desk.cleaning'])).toEqual(['cleaning', 'schedule']);
    expect(resolveBottomNavItems(['desk.cleaning'], { showWash: true })).toEqual([
      'cleaning',
      'more',
    ]);
    expect(resolveBottomNavItems(['desk.check_in', 'desk.cleaning'])).toEqual([
      'today',
      'bookings',
      'more',
    ]);
  });

  it('scopes More badge to visible More tabs only (excludes Booking.com inbox)', () => {
    expect(resolveMoreBadgeCount(['desk.check_in'], 2, 1)).toBe(3);
    expect(resolveMoreBadgeCount(['desk.check_in', 'desk.cleaning'], 2, 1)).toBe(3);
    // Cleaning-only: Issues/Transfers not in More (promoted schedule) → no badge.
    expect(resolveMoreBadgeCount(['desk.cleaning'], 5, 3)).toBe(0);
  });

  it('maps desk tabs to primary nav', () => {
    expect(resolvePrimaryNavForDeskTab('desk', ['desk.check_in'])).toBe('today');
    expect(resolvePrimaryNavForDeskTab('plan', ['desk.check_in'])).toBe('bookings');
    expect(resolvePrimaryNavForDeskTab('booking-inbox', ['desk.check_in'])).toBe('bookings');
    expect(resolvePrimaryNavForDeskTab('archive', ['desk.check_in'])).toBe('bookings');
    expect(resolvePrimaryNavForDeskTab('access', ['desk.check_in'])).toBe('more');
    expect(resolvePrimaryNavForDeskTab('cash', ['desk.check_in'])).toBe('more');
    expect(resolvePrimaryNavForDeskTab('issues', ['desk.check_in'])).toBe('more');
    expect(resolvePrimaryNavForDeskTab('schedule', ['desk.check_in'])).toBe('more');
    expect(resolvePrimaryNavForDeskTab('schedule', ['desk.cleaning'])).toBe('schedule');
    expect(resolvePrimaryNavForDeskTab('cleaning', ['desk.cleaning'])).toBe('cleaning');
    expect(
      resolvePrimaryNavForDeskTab('wash', ['desk.cleaning'], { showWash: true })
    ).toBe('more');
  });

  it('resolves bottom-nav taps to desk tabs (Bookings → Plan; More → menu surface)', () => {
    expect(resolveDeskTabForPrimaryNav('today', ['desk.check_in'])).toBe('desk');
    expect(resolveDeskTabForPrimaryNav('bookings', ['desk.check_in'])).toBe('plan');
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
    expect(
      resolveActivePrimaryNav({
        deskTab: 'access',
        moreMenuOpen: false,
        permissions: ['desk.check_in'],
      })
    ).toBe('more');
  });
});
