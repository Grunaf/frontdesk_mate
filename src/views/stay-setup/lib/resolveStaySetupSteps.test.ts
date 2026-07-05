import { describe, expect, it } from 'vitest';
import {
  resolveFirstIncompleteStaySetupStep,
  resolveNextStaySetupStep,
} from './resolveStaySetupSteps';

describe('resolveStaySetupSteps', () => {
  it('starts at register when tourism required and incomplete', () => {
    expect(
      resolveFirstIncompleteStaySetupStep(true, {
        tourismRequired: true,
        tourismComplete: false,
        contactComplete: false,
      })
    ).toBe('register');
  });

  it('skips to contact when tourism complete', () => {
    expect(
      resolveFirstIncompleteStaySetupStep(true, {
        tourismRequired: true,
        tourismComplete: true,
        contactComplete: false,
      })
    ).toBe('contact');
  });

  it('goes register → contact → settlement', () => {
    const beforeContact = {
      tourismRequired: true,
      tourismComplete: true,
      contactComplete: false,
    };
    expect(resolveNextStaySetupStep('register', true, beforeContact)).toBe('contact');
    expect(resolveNextStaySetupStep('contact', true, beforeContact)).toBe('settlement');
    expect(
      resolveNextStaySetupStep('register', true, {
        ...beforeContact,
        contactComplete: true,
      })
    ).toBe('settlement');
  });
});
