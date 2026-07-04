import { describe, expect, it } from 'vitest';
import {
  canGenerateFromInterview,
  compileInterviewToSourceText,
  getGuidedInterviewQuestions,
  getInterviewProgress,
} from './guidedRouteInterview';

describe('guidedRouteInterview', () => {
  it('lists all required transit questions upfront', () => {
    const questions = getGuidedInterviewQuestions('transit', 'Airport');
    const requiredIds = questions.filter((q) => q.required).map((q) => q.id);
    expect(requiredIds).toEqual(['walk-to-stop', 'board-and-ride', 'get-off']);
  });

  it('blocks generate until required questions are resolved', () => {
    const questions = getGuidedInterviewQuestions('transit', 'Airport');
    expect(canGenerateFromInterview(questions, {})).toBe(false);

    const partial = {
      'walk-to-stop': { status: 'answered' as const, value: 'Exit and turn left.' },
    };
    expect(canGenerateFromInterview(questions, partial)).toBe(false);

    const done = {
      ...partial,
      'board-and-ride': { status: 'answered' as const, value: 'Bus 37' },
      'get-off': { status: 'unknown' as const, value: '' },
    };
    expect(canGenerateFromInterview(questions, done)).toBe(true);
  });

  it('compiles structured answers for the model', () => {
    const questions = getGuidedInterviewQuestions('transit', 'Airport');
    const compiled = compileInterviewToSourceText({
      hubLabel: 'Airport',
      routeMode: 'transit',
      questions,
      answers: {
        'walk-to-stop': { status: 'answered', value: 'Five minutes to the stop.' },
        'board-and-ride': { status: 'answered', value: 'Line 37 toward old town.' },
        'get-off': { status: 'answered', value: 'Main gate.' },
      },
    });

    expect(compiled).toContain('Public transit');
    expect(compiled).toContain('Line 37');
    expect(compiled.length).toBeGreaterThan(20);
  });

  it('tracks progress on required vs optional', () => {
    const questions = getGuidedInterviewQuestions('walk_only', 'Bus station');
    const progress = getInterviewProgress(questions, {
      'walk-path': { status: 'answered', value: 'Follow the seafront path.' },
    });
    expect(progress.resolvedRequired).toBe(1);
    expect(progress.requiredTotal).toBe(1);
  });
});
