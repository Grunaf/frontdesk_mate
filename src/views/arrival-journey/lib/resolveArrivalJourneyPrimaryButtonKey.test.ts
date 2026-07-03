import { describe, expect, it } from 'vitest';
import { resolveArrivalJourneyPrimaryButtonKey } from './resolveArrivalJourneyPrimaryButtonKey';

describe('resolveArrivalJourneyPrimaryButtonKey', () => {
  it('uses check-in CTA on route when guest is not registered', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('route', false)).toBe(
      'directions.checkInToContinue'
    );
  });

  it('keeps route enter CTA when registered', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('route', true)).toBe('directions.actionButton');
  });

  it('keeps step-specific keys for other steps', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('info', false)).toBe('preTrip.actionButton');
    expect(resolveArrivalJourneyPrimaryButtonKey('arrival', true)).toBe('arrival.actionButton');
  });
});
