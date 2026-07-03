import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  buildStayEssentialsPreCheckInReadStorageKey,
  buildStayEssentialsStayReadStorageKey,
} from './buildStayEssentialsReadStorageKey';
import { migratePreCheckInStayEssentialReads } from './migratePreCheckInStayEssentialReads';
import { persistStayEssentialRead, readStayEssentialRead } from './stayEssentialReadStorage';

describe('stay essentials pre-check-in read keys', () => {
  it('builds pre-check-in and stay-scoped keys', () => {
    expect(buildStayEssentialsPreCheckInReadStorageKey('vega', 'arrivalGuide')).toBe(
      'stayEssentialsRead:vega:preCheckIn:arrivalGuide'
    );
    expect(buildStayEssentialsStayReadStorageKey('vega', 'stay-1', 'wifi')).toBe(
      'stayEssentialsRead:vega:stay-1:wifi'
    );
  });
});

describe('migratePreCheckInStayEssentialReads', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('window', {
      localStorage: {
        getItem(key: string) {
          return store[key] ?? null;
        },
        setItem(key: string, value: string) {
          store[key] = value;
        },
      },
    });
  });

  it('copies arrival read from preCheckIn to stay scope', () => {
    const preKey = buildStayEssentialsPreCheckInReadStorageKey('vega', 'arrivalGuide');
    persistStayEssentialRead(preKey);

    migratePreCheckInStayEssentialReads('vega', 'stay-abc');

    const stayKey = buildStayEssentialsStayReadStorageKey('vega', 'stay-abc', 'arrivalGuide');
    expect(readStayEssentialRead(stayKey)).toBe(true);
    expect(readStayEssentialRead(preKey)).toBe(true);
  });
});
