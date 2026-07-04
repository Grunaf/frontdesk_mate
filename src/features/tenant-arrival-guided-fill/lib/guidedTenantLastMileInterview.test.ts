import { describe, expect, it } from 'vitest';
import {
  canGenerateTenantLastMile,
  compileTenantLastMileSource,
  getTenantLastMileInterviewQuestions,
} from './guidedTenantLastMileInterview';

describe('guidedTenantLastMileInterview', () => {
  it('requires start and walk before generate', () => {
    const questions = getTenantLastMileInterviewQuestions('Airport');
    expect(canGenerateTenantLastMile(questions, {})).toBe(false);
    expect(
      canGenerateTenantLastMile(questions, {
        'start-point': { status: 'answered', value: 'Main gate' },
        'walk-directions': { status: 'unknown', value: '' },
      })
    ).toBe(true);
  });

  it('includes city context in compiled source', () => {
    const compiled = compileTenantLastMileSource({
      hubLabel: 'Airport',
      cityContext: 'Typical get-off: Terminal A',
      questions: getTenantLastMileInterviewQuestions('Airport'),
      answers: {
        'start-point': { status: 'answered', value: 'Terminal A curb' },
        'walk-directions': { status: 'answered', value: 'Walk 3 min to {address}' },
      },
    });
    expect(compiled).toContain('Terminal A');
    expect(compiled).toContain('{address}');
  });
});
