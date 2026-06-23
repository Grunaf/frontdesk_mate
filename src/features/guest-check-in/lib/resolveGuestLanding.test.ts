import { describe, expect, it } from 'vitest';
import {
  resolveEntryForLanding,
  resolvePostCheckInPath,
  shouldShowGuestIntentScreen,
} from './resolveGuestLanding';

describe('shouldShowGuestIntentScreen', () => {
  it('shows when no entry, onsite flag, or stored intent', () => {
    expect(shouldShowGuestIntentScreen({})).toBe(true);
  });

  it('skips when entry is in the URL', () => {
    expect(shouldShowGuestIntentScreen({ urlEntry: 'remote' })).toBe(false);
  });

  it('skips when intent is already stored', () => {
    expect(shouldShowGuestIntentScreen({ storedIntent: 'at_door' })).toBe(false);
  });

  it('skips for legacy onsite mode', () => {
    expect(shouldShowGuestIntentScreen({ modeOnsite: true })).toBe(false);
  });
});

describe('resolveEntryForLanding', () => {
  it('prefers URL entry over stored intent', () => {
    expect(
      resolveEntryForLanding({ urlEntry: 'desk', storedIntent: 'planning' })
    ).toBe('desk');
  });

  it('falls back to stored intent', () => {
    expect(resolveEntryForLanding({ storedIntent: 'at_door' })).toBe('door');
  });
});

describe('resolvePostCheckInPath', () => {
  it('routes to intent screen by default', () => {
    expect(resolvePostCheckInPath({ locale: 'en' })).toBe('/en/check-in/intent');
  });

  it('routes directly when entry is known', () => {
    expect(resolvePostCheckInPath({ locale: 'en', urlEntry: 'remote' })).toBe(
      '/en/welcome?step=route'
    );
    expect(resolvePostCheckInPath({ locale: 'en', storedIntent: 'at_desk' })).toBe(
      '/en/welcome?step=settlement'
    );
  });
});
