import { describe, expect, it } from 'vitest';
import { enforceGuidedSingleScenario } from './enforceGuidedSingleScenario';
import type { GuidedRouteFillPreview } from '../model/types';

describe('enforceGuidedSingleScenario', () => {
  it('moves taxi-only sentences out of publicText when transit is primary', () => {
    const raw =
      'Take bus 37 from the airport to the old town. At night there is no bus — take a taxi from the stand.';
    const preview: GuidedRouteFillPreview = {
      copy: {
        publicTitle: 'Airport bus',
        publicSummary: 'Bus to town. At night take a taxi.',
        publicText: 'Board bus 37. If it is late, take a taxi instead.',
        publicGetOffAt: 'Old town gate',
      },
      openQuestions: [],
    };

    const next = enforceGuidedSingleScenario(preview, raw);

    expect(next.copy.publicText).toBe('Board bus 37.');
    expect(next.copy.publicSummary).toBe('Bus to town.');
    expect(next.tips?.some((tip) => /taxi/i.test(tip))).toBe(true);
    expect(next.copy.publicText).not.toMatch(/taxi/i);
  });

  it('adds open question when input mentions bus and taxi but model left taxi only in narrative', () => {
    const raw = 'Guests take the bus, or a taxi if they prefer.';
    const preview: GuidedRouteFillPreview = {
      copy: {
        publicText: 'Take the bus to the hostel.',
      },
      openQuestions: [],
    };

    const next = enforceGuidedSingleScenario(preview, raw);
    expect(next.openQuestions.some((q) => q.field === 'tips')).toBe(true);
  });
});
