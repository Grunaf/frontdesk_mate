import { describe, expect, it } from 'vitest';
import {
  canGuestClearStayPresence,
  canGuestMarkStayVacant,
  isHousekeepingStayPresenceSource,
  isValidGuestStayPresenceUpsert,
} from './stayPresence';

describe('isHousekeepingStayPresenceSource', () => {
  it('accepts guest and staff', () => {
    expect(isHousekeepingStayPresenceSource('guest')).toBe(true);
    expect(isHousekeepingStayPresenceSource('staff')).toBe(true);
    expect(isHousekeepingStayPresenceSource('system')).toBe(false);
  });
});

describe('canGuestMarkStayVacant', () => {
  it('allows when unset', () => {
    expect(canGuestMarkStayVacant(null)).toBe(true);
  });

  it('blocks when already vacant from any source', () => {
    expect(canGuestMarkStayVacant({ status: 'vacant', source: 'guest' })).toBe(false);
    expect(canGuestMarkStayVacant({ status: 'vacant', source: 'staff' })).toBe(false);
  });

  it('allows when still_here', () => {
    expect(canGuestMarkStayVacant({ status: 'still_here', source: 'staff' })).toBe(true);
  });
});

describe('canGuestClearStayPresence', () => {
  it('allows only guest-authored rows', () => {
    expect(canGuestClearStayPresence({ status: 'vacant', source: 'guest' })).toBe(true);
    expect(canGuestClearStayPresence({ status: 'vacant', source: 'staff' })).toBe(false);
    expect(canGuestClearStayPresence(null)).toBe(false);
  });
});

describe('isValidGuestStayPresenceUpsert', () => {
  it('allows only vacant + guest', () => {
    expect(isValidGuestStayPresenceUpsert({ status: 'vacant', source: 'guest' })).toBe(true);
    expect(isValidGuestStayPresenceUpsert({ status: 'still_here', source: 'guest' })).toBe(
      false
    );
    expect(isValidGuestStayPresenceUpsert({ status: 'vacant', source: 'staff' })).toBe(false);
  });
});
