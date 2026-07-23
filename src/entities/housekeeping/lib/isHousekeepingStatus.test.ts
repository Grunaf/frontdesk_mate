import { describe, expect, it } from 'vitest';
import {
  isHousekeepingBedStatus,
  isHousekeepingRoomStatus,
} from './isHousekeepingStatus';

describe('isHousekeepingBedStatus', () => {
  it('accepts pipeline enum values', () => {
    expect(isHousekeepingBedStatus('needs_strip')).toBe(true);
    expect(isHousekeepingBedStatus('stripped')).toBe(true);
    expect(isHousekeepingBedStatus('ready')).toBe(true);
  });

  it('rejects legacy and unknown values', () => {
    expect(isHousekeepingBedStatus('waiting_linen')).toBe(false);
    expect(isHousekeepingBedStatus('no_linen')).toBe(false);
    expect(isHousekeepingBedStatus('cleaned')).toBe(false);
    expect(isHousekeepingBedStatus('')).toBe(false);
    expect(isHousekeepingBedStatus(null)).toBe(false);
  });
});

describe('isHousekeepingRoomStatus', () => {
  it('accepts fixed enum values', () => {
    expect(isHousekeepingRoomStatus('cleaned')).toBe(true);
    expect(isHousekeepingRoomStatus('not_cleaned')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isHousekeepingRoomStatus('ready')).toBe(false);
    expect(isHousekeepingRoomStatus(undefined)).toBe(false);
  });
});
