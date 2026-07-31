import { describe, expect, it } from 'vitest';

import {
  DESK_CHECK_IN_PERMISSION,
  DESK_CLEANING_PERMISSION,
  DESK_EDIT_PAST_STAYS_PERMISSION,
  DESK_SKIP_TOURISM_GATE_PERMISSION,
  isReceptionStaffPermission,
  receptionStaffCanCheckIn,
  receptionStaffCanClean,
  receptionStaffCanEditPastStays,
  receptionStaffCanManageArchive,
  receptionStaffCanManageHousekeeping,
  receptionStaffCanSkipTourismGate,
  receptionStaffHasPermission,
  resolveEffectiveReceptionStaffPermissions,
  sanitizeReceptionStaffPermissions,
} from './receptionPermissions';

describe('receptionPermissions', () => {
  it('whitelists desk.check_in, desk.cleaning, desk.skip_tourism_gate, and desk.edit_past_stays', () => {
    expect(isReceptionStaffPermission('desk.check_in')).toBe(true);
    expect(isReceptionStaffPermission('desk.cleaning')).toBe(true);
    expect(isReceptionStaffPermission('desk.skip_tourism_gate')).toBe(true);
    expect(isReceptionStaffPermission('desk.edit_past_stays')).toBe(true);
    expect(isReceptionStaffPermission('reservation.archive.read')).toBe(false);
    expect(isReceptionStaffPermission('nope')).toBe(false);
  });

  it('drops legacy trash/archive keys and unknown values on sanitize', () => {
    expect(
      sanitizeReceptionStaffPermissions([
        'reservation.trash.read',
        'reservation.archive.restore',
        'reservation.archive.purge',
        'desk.check_in',
        'nope',
        'desk.cleaning',
        'desk.skip_tourism_gate',
        'desk.edit_past_stays',
        'desk.check_in',
      ])
    ).toEqual([
      DESK_CHECK_IN_PERMISSION,
      DESK_CLEANING_PERMISSION,
      DESK_SKIP_TOURISM_GATE_PERMISSION,
      DESK_EDIT_PAST_STAYS_PERMISSION,
    ]);
  });

  it('keeps empty after sanitize for legacy / volunteer create', () => {
    expect(sanitizeReceptionStaffPermissions([])).toEqual([]);
    expect(sanitizeReceptionStaffPermissions(null)).toEqual([]);
    expect(sanitizeReceptionStaffPermissions(undefined)).toEqual([]);
  });

  it('treats empty permissions as check-in only (compat) without skip tourism or edit past', () => {
    expect(resolveEffectiveReceptionStaffPermissions([])).toEqual([DESK_CHECK_IN_PERMISSION]);
    expect(receptionStaffCanCheckIn([])).toBe(true);
    expect(receptionStaffCanClean([])).toBe(false);
    expect(receptionStaffCanSkipTourismGate([])).toBe(false);
    expect(receptionStaffCanEditPastStays([])).toBe(false);
    expect(receptionStaffHasPermission([], DESK_CHECK_IN_PERMISSION)).toBe(true);
    expect(receptionStaffHasPermission([], DESK_CLEANING_PERMISSION)).toBe(false);
    expect(receptionStaffHasPermission([], DESK_SKIP_TOURISM_GATE_PERMISSION)).toBe(false);
    expect(receptionStaffHasPermission([], DESK_EDIT_PAST_STAYS_PERMISSION)).toBe(false);
  });

  it('supports cleaning-only and both functions', () => {
    expect(receptionStaffCanCheckIn([DESK_CLEANING_PERMISSION])).toBe(false);
    expect(receptionStaffCanClean([DESK_CLEANING_PERMISSION])).toBe(true);

    expect(
      receptionStaffCanCheckIn([DESK_CHECK_IN_PERMISSION, DESK_CLEANING_PERMISSION])
    ).toBe(true);
    expect(
      receptionStaffCanClean([DESK_CHECK_IN_PERMISSION, DESK_CLEANING_PERMISSION])
    ).toBe(true);
  });

  it('gates skip tourism only when explicitly granted', () => {
    expect(receptionStaffCanSkipTourismGate([DESK_CHECK_IN_PERMISSION])).toBe(false);
    expect(
      receptionStaffCanSkipTourismGate([
        DESK_CHECK_IN_PERMISSION,
        DESK_SKIP_TOURISM_GATE_PERMISSION,
      ])
    ).toBe(true);
    expect(
      receptionStaffCanSkipTourismGate([DESK_SKIP_TOURISM_GATE_PERMISSION])
    ).toBe(true);
  });

  it('gates edit past stays only when explicitly granted', () => {
    expect(receptionStaffCanEditPastStays([DESK_CHECK_IN_PERMISSION])).toBe(false);
    expect(
      receptionStaffCanEditPastStays([
        DESK_CHECK_IN_PERMISSION,
        DESK_EDIT_PAST_STAYS_PERMISSION,
      ])
    ).toBe(true);
    expect(receptionStaffCanEditPastStays([DESK_EDIT_PAST_STAYS_PERMISSION])).toBe(true);
  });

  it('allows housekeeping for check-in or cleaning', () => {
    expect(receptionStaffCanManageHousekeeping([])).toBe(true);
    expect(receptionStaffCanManageHousekeeping([DESK_CHECK_IN_PERMISSION])).toBe(true);
    expect(receptionStaffCanManageHousekeeping([DESK_CLEANING_PERMISSION])).toBe(true);
  });

  it('gates archive with check-in capability', () => {
    expect(receptionStaffCanManageArchive([])).toBe(true);
    expect(receptionStaffCanManageArchive([DESK_CHECK_IN_PERMISSION])).toBe(true);
    expect(receptionStaffCanManageArchive([DESK_CLEANING_PERMISSION])).toBe(false);
  });
});
