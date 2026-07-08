import { describe, expect, it } from 'vitest';
import { createBlankCityPackRouteContent } from './resolveAdminCityPackTransport';
import {
  buildLastMileCityBoundary,
  detectLastMileWalkOverlap,
  formatLastMileBoundaryForPrompt,
} from './buildLastMileCityBoundary';

describe('buildLastMileCityBoundary', () => {
  it('anchors transit last mile on get-off and lists do-not-repeat', () => {
    const route = createBlankCityPackRouteContent('airport');
    route.copy.publicGetOffAt = { en: 'Main square bus stop' };
    route.copy.publicText = { en: 'Take bus 8 to the old town.' };
    route.tips = [{ en: 'Buy ticket at kiosk' }];

    const boundary = buildLastMileCityBoundary(route)!;
    expect(boundary.hasAnchoredStart).toBe(true);
    expect(boundary.anchorLabelEn).toBe('Main square bus stop');
    expect(boundary.doNotRepeat.some((line) => /Good to know/i.test(line))).toBe(true);

    const prompt = formatLastMileBoundaryForPrompt(boundary)!;
    expect(prompt).toContain('DO NOT repeat');
    expect(prompt).toContain('Main square bus stop');
  });

  it('anchors walk_only on city publicText excerpt', () => {
    const route = createBlankCityPackRouteContent('bus_central');
    route.routeMode = 'walk_only';
    route.copy.publicText = {
      en: 'Exit the station and follow the river path. Turn left at the bridge.',
    };

    const boundary = buildLastMileCityBoundary(route)!;
    expect(boundary.routeMode).toBe('walk_only');
    expect(boundary.hasAnchoredStart).toBe(true);
  });

  it('prefers tenant get-off override over city publicGetOffAt', () => {
    const route = createBlankCityPackRouteContent('airport');
    route.copy.publicGetOffAt = { en: 'Main square bus stop' };

    const boundary = buildLastMileCityBoundary(route, {
      getOffOverrideEn: 'Side street before the square',
    })!;
    expect(boundary.anchorLabelEn).toBe('Side street before the square');
    expect(boundary.doNotRepeat.some((line) => /hostel override/i.test(line))).toBe(true);
    expect(boundary.doNotRepeat.every((line) => !line.includes('Main square bus stop'))).toBe(
      true
    );
  });
});

describe('detectLastMileWalkOverlap', () => {
  it('flags repetition of get-off text', () => {
    const route = createBlankCityPackRouteContent('airport');
    route.copy.publicGetOffAt = { en: 'Terminal A arrivals curb' };
    const boundary = buildLastMileCityBoundary(route)!;

    const warnings = detectLastMileWalkOverlap(
      'From Terminal A arrivals curb walk north to the hostel.',
      boundary
    );
    expect(warnings.length).toBeGreaterThan(0);
  });
});
