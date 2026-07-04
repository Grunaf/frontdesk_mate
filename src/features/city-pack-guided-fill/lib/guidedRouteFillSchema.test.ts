import { describe, expect, it } from 'vitest';
import { enforceGuidedSingleScenario } from './enforceGuidedSingleScenario';
import { modelOutputToPreview } from './guidedRouteFillSchema';

describe('guidedRouteFillSchema fixture', () => {
  it('bus primary with taxi in model output — taxi ends in tips not steps', () => {
    const raw =
      'From the bus station take line 2 to the old town. After midnight take a taxi from the stand outside.';
    const fixture = {
      routeMode: 'transit' as const,
      publicTitle: 'Main bus to hostel',
      publicSummary: 'Take bus 2, or a taxi at night.',
      publicText: 'Board bus 2 toward old town. Late at night use a taxi from the station.',
      publicGetOffAt: 'Old town main gate',
      tips: [] as string[],
      openQuestions: [] as { id: string; field: 'tips'; question: string }[],
    };

    const preview = enforceGuidedSingleScenario(modelOutputToPreview(fixture), raw);

    expect(preview.copy.publicText).not.toMatch(/taxi/i);
    expect(preview.tips?.join(' ')).toMatch(/taxi/i);
  });
});
