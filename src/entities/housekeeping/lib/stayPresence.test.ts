import { describe, expect, it } from 'vitest';
import {
  housekeepingStayPresenceDeskLabel,
  isHousekeepingStayPresenceStatus,
} from './stayPresence';

describe('isHousekeepingStayPresenceStatus', () => {
  it('accepts vacant and still_here', () => {
    expect(isHousekeepingStayPresenceStatus('vacant')).toBe(true);
    expect(isHousekeepingStayPresenceStatus('still_here')).toBe(true);
    expect(isHousekeepingStayPresenceStatus('ready')).toBe(false);
  });
});

describe('housekeepingStayPresenceDeskLabel', () => {
  it('labels vacant for desk Departures', () => {
    expect(housekeepingStayPresenceDeskLabel('vacant')).toBe('Cleaning: vacant');
    expect(housekeepingStayPresenceDeskLabel('still_here')).toBe('Cleaning: still here');
    expect(housekeepingStayPresenceDeskLabel(undefined)).toBeNull();
  });
});
