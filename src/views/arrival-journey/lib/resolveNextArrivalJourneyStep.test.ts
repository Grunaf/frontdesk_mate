import { describe, expect, it } from 'vitest';
import {
  resolveNextArrivalJourneyStep,
  resolvePublicArrivalJourneyTab,
} from './resolveNextArrivalJourneyStep';

describe('resolveNextArrivalJourneyStep', () => {
  it('skips route when routes are hidden', () => {
    expect(resolveNextArrivalJourneyStep('info', false, false)).toBe('arrival');
  });

  it('goes to route from preparation when routes are available', () => {
    expect(resolveNextArrivalJourneyStep('info', true, false)).toBe('route');
  });
});

describe('resolvePublicArrivalJourneyTab', () => {
  it('falls back to route when routes are available', () => {
    expect(resolvePublicArrivalJourneyTab(true)).toBe('route');
  });

  it('falls back to preparation when routes are hidden', () => {
    expect(resolvePublicArrivalJourneyTab(false)).toBe('info');
  });
});
