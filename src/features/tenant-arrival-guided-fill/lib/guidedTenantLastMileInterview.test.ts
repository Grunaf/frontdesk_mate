import { describe, expect, it } from 'vitest';
import { createBlankCityPackRouteContent } from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
import {
  canGenerateTenantLastMile,
  compileTenantLastMileSource,
  getTenantLastMileInterviewQuestions,
} from './guidedTenantLastMileInterview';
import { buildLastMileCityBoundary } from '@/entities/city-pack';

describe('guidedTenantLastMileInterview', () => {
  it('requires only walk-directions when city supplies get-off anchor', () => {
    const route = createBlankCityPackRouteContent('airport');
    route.copy.publicGetOffAt = { en: 'Main gate' };
    const boundary = buildLastMileCityBoundary(route)!;
    const questions = getTenantLastMileInterviewQuestions('Airport', boundary);
    expect(questions.some((q) => q.id === 'start-point')).toBe(false);
    expect(canGenerateTenantLastMile(questions, {})).toBe(false);
    expect(
      canGenerateTenantLastMile(questions, {
        'walk-directions': { status: 'answered', value: 'Turn left to {address}' },
      })
    ).toBe(true);
  });

  it('includes city boundary in compiled source', () => {
    const route = createBlankCityPackRouteContent('airport');
    route.copy.publicGetOffAt = { en: 'Terminal A' };
    const boundary = buildLastMileCityBoundary(route)!;
    const questions = getTenantLastMileInterviewQuestions('Airport', boundary);
    const compiled = compileTenantLastMileSource({
      hubLabel: 'Airport',
      cityBoundaryBlock: 'DO NOT repeat get-off',
      questions,
      answers: {
        'walk-directions': { status: 'answered', value: 'Walk 3 min to {address}' },
      },
    });
    expect(compiled).toContain('DO NOT repeat');
    expect(compiled).toContain('{address}');
  });

  it('uses tenant get-off override as interview anchor', () => {
    const route = createBlankCityPackRouteContent('airport');
    route.copy.publicGetOffAt = { en: 'Main gate' };
    const boundary = buildLastMileCityBoundary(route, {
      getOffOverrideEn: 'Earlier side stop',
    })!;
    const questions = getTenantLastMileInterviewQuestions('Airport', boundary);
    expect(questions.some((q) => q.id === 'start-point')).toBe(false);
    expect(questions.find((q) => q.id === 'walk-directions')?.hint).toContain('Earlier side stop');
  });
});
