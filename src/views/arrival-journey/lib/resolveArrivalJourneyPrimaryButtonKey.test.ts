import { describe, expect, it } from 'vitest';
import { resolveArrivalJourneyPrimaryButtonKey } from './resolveArrivalJourneyPrimaryButtonKey';

describe('resolveArrivalJourneyPrimaryButtonKey', () => {
  it('uses check-in CTA on route when guest is not registered', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('route', false, true, false)).toBe(
      'directions.checkInToContinue'
    );
  });

  it('keeps route enter CTA when registered', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('route', true, true, false)).toBe(
      'directions.actionButton'
    );
  });

  it('uses view directions on preparation when routes are available', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('info', false, true, false)).toBe(
      'preTrip.actionButton'
    );
    expect(resolveArrivalJourneyPrimaryButtonKey('info', true, true, false)).toBe(
      'preTrip.actionButton'
    );
  });

  it('uses check-in CTA on preparation when routes hidden and guest is not registered', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('info', false, false, false)).toBe(
      'directions.checkInToContinue'
    );
  });

  it('uses how to enter on preparation when routes hidden and guest is registered', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('info', true, false, false)).toBe(
      'arrival.actionButton'
    );
  });

  it('keeps arrival settle CTA on check-in day', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('arrival', true, true, true)).toBe(
      'arrival.actionButton'
    );
  });

  it('uses concierge CTA on arrival before check-in day', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('arrival', true, true, false)).toBe(
      'arrival.goToConcierge'
    );
  });
});
