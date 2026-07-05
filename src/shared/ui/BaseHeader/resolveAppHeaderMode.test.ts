import { describe, expect, it } from 'vitest';
import { resolveAppHeaderMode, shouldAutoHideAppHeader, shouldAutoHideArrivalGuideSteps } from './resolveAppHeaderMode';

describe('resolveAppHeaderMode', () => {
  it('returns concierge for home path', () => {
    expect(resolveAppHeaderMode('/')).toBe('concierge');
  });

  it('returns arrivalGuide for welcome', () => {
    expect(resolveAppHeaderMode('/welcome')).toBe('arrivalGuide');
  });

  it('returns arrivalGuide for stay-setup', () => {
    expect(resolveAppHeaderMode('/stay-setup')).toBe('arrivalGuide');
  });

  it('returns preSession for check-in routes', () => {
    expect(resolveAppHeaderMode('/check-in')).toBe('preSession');
    expect(resolveAppHeaderMode('/check-in/intent')).toBe('preSession');
  });

  it('returns nested for drill-down and other app routes', () => {
    expect(resolveAppHeaderMode('/guide')).toBe('nested');
    expect(resolveAppHeaderMode('/services')).toBe('nested');
    expect(resolveAppHeaderMode('/faq')).toBe('nested');
    expect(resolveAppHeaderMode('/memories')).toBe('nested');
  });
});

describe('shouldAutoHideAppHeader', () => {
  it('disables auto-hide for pre-session check-in routes', () => {
    expect(shouldAutoHideAppHeader('preSession')).toBe(false);
  });

  it('enables auto-hide for concierge and nested routes', () => {
    expect(shouldAutoHideAppHeader('concierge')).toBe(true);
    expect(shouldAutoHideAppHeader('nested')).toBe(true);
  });

  it('disables header auto-hide for arrival guide', () => {
    expect(shouldAutoHideAppHeader('arrivalGuide')).toBe(false);
  });
});

describe('shouldAutoHideArrivalGuideSteps', () => {
  it('enables step chips auto-hide only on arrival guide', () => {
    expect(shouldAutoHideArrivalGuideSteps('arrivalGuide')).toBe(true);
    expect(shouldAutoHideArrivalGuideSteps('concierge')).toBe(false);
    expect(shouldAutoHideArrivalGuideSteps('nested')).toBe(false);
    expect(shouldAutoHideArrivalGuideSteps('preSession')).toBe(false);
  });
});
