import { describe, expect, it } from 'vitest';
import {
  resolveNextArrivalJourneyStep,
  resolvePublicArrivalJourneyTab,
} from './resolveNextArrivalJourneyStep';

describe('resolveNextArrivalJourneyStep', () => {
  it('skips route when routes are hidden', () => {
    expect(resolveNextArrivalJourneyStep('info', false)).toBe('arrival');
  });

  it('goes to route from preparation when routes are available', () => {
    expect(resolveNextArrivalJourneyStep('info', true)).toBe('route');
  });

  it('ends after arrival', () => {
    expect(resolveNextArrivalJourneyStep('arrival', true)).toBeNull();
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
