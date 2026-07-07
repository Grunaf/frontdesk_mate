import { describe, expect, it } from 'vitest';
import {
  normalizeStaySetupUrlStep,
  resolveFirstIncompleteStaySetupStep,
  resolveNextStaySetupStep,
  resolvePreviousStaySetupStep,
  resolveStaySetupStepOrder,
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

  it('lands on essentials when contact complete', () => {
    expect(
      resolveFirstIncompleteStaySetupStep(true, {
        tourismRequired: true,
        tourismComplete: true,
        contactComplete: true,
      })
    ).toBe('essentials');
  });

  it('goes register → contact → essentials → room', () => {
    const beforeContact = {
      tourismRequired: true,
      tourismComplete: true,
      contactComplete: false,
    };
    expect(resolveNextStaySetupStep('register', true, beforeContact)).toBe('contact');
    expect(resolveNextStaySetupStep('contact', true, beforeContact)).toBe('essentials');
    expect(
      resolveNextStaySetupStep('contact', true, {
        ...beforeContact,
        contactComplete: true,
      })
    ).toBe('essentials');
    expect(
      resolveNextStaySetupStep('essentials', true, {
        ...beforeContact,
        contactComplete: true,
      })
    ).toBe('room');
    expect(
      resolveNextStaySetupStep('register', true, {
        tourismRequired: true,
        tourismComplete: true,
        contactComplete: true,
      })
    ).toBe('essentials');
  });

  it('keeps contact in step order after contact is complete', () => {
    expect(
      resolveStaySetupStepOrder(true, {
        tourismRequired: true,
        tourismComplete: true,
        contactComplete: true,
      })
    ).toEqual(['register', 'contact', 'essentials', 'room']);
  });

  it('maps legacy settlement url to room', () => {
    expect(normalizeStaySetupUrlStep('settlement')).toBe('room');
  });

  it('resolves previous step in order', () => {
    const completion = {
      tourismRequired: true,
      tourismComplete: true,
      contactComplete: true,
    };
    expect(resolvePreviousStaySetupStep('room', true, completion)).toBe('essentials');
    expect(resolvePreviousStaySetupStep('essentials', true, completion)).toBe('contact');
    expect(resolvePreviousStaySetupStep('contact', true, completion)).toBe('register');
    expect(resolvePreviousStaySetupStep('register', true, completion)).toBe(null);
  });

  it('returns null for previous on first step without tourism', () => {
    expect(
      resolvePreviousStaySetupStep('contact', false, {
        tourismRequired: false,
        tourismComplete: false,
        contactComplete: false,
      })
    ).toBe(null);
  });
});
