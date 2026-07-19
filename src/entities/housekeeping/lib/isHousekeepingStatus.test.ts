import { describe, expect, it } from 'vitest';
import {
  isHousekeepingBedStatus,
  isHousekeepingRoomStatus,
} from './isHousekeepingStatus';

describe('isHousekeepingBedStatus', () => {
  it('accepts fixed enum values', () => {
    expect(isHousekeepingBedStatus('ready')).toBe(true);
    expect(isHousekeepingBedStatus('waiting_linen')).toBe(true);
    expect(isHousekeepingBedStatus('no_linen')).toBe(true);
  });

  it('rejects unknown values', () => {
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
