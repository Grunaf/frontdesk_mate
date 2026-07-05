import { describe, expect, it } from 'vitest';
import { resolveArrivalJourneyPrimaryButtonKey } from './resolveArrivalJourneyPrimaryButtonKey';

describe('resolveArrivalJourneyPrimaryButtonKey', () => {
  it('uses check-in CTA on route when guest is not registered', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('route', false, true)).toBe(
      'directions.checkInToContinue'
    );
  });

  it('keeps route enter CTA when registered', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('route', true, true)).toBe(
      'directions.actionButton'
    );
  });

  it('uses view directions on preparation when routes are available', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('info', false, true)).toBe(
      'preTrip.actionButton'
    );
    expect(resolveArrivalJourneyPrimaryButtonKey('info', true, true)).toBe(
      'preTrip.actionButton'
    );
  });

  it('uses check-in CTA on preparation when routes hidden and guest is not registered', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('info', false, false)).toBe(
      'directions.checkInToContinue'
    );
  });

  it('uses how to enter on preparation when routes hidden and guest is registered', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('info', true, false)).toBe(
      'arrival.actionButton'
    );
  });

  it('keeps arrival action when registered', () => {
    expect(resolveArrivalJourneyPrimaryButtonKey('arrival', true, true)).toBe(
      'arrival.actionButton'
    );
  });
});
