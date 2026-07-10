import { describe, expect, it } from 'vitest';
import {
  normalizeStaySetupUrlStep,
  resolveFirstIncompleteStaySetupStep,
  resolveNextStaySetupStep,
  resolvePreviousStaySetupStep,
  resolveStaySetupStepOrder,
} from './resolveStaySetupSteps';

describe('resolveStaySetupSteps', () => {
  it('starts at registration when tourism required and incomplete', () => {
    expect(
      resolveFirstIncompleteStaySetupStep(true, {
        tourismRequired: true,
        tourismComplete: false,
        contactComplete: false,
      })
    ).toBe('registration');
  });

  it('stays on registration when tourism complete but contact incomplete', () => {
    expect(
      resolveFirstIncompleteStaySetupStep(true, {
        tourismRequired: true,
        tourismComplete: true,
        contactComplete: false,
      })
    ).toBe('registration');
  });

  it('lands on essentials when registration aggregate complete', () => {
    expect(
      resolveFirstIncompleteStaySetupStep(true, {
        tourismRequired: true,
        tourismComplete: true,
        contactComplete: true,
      })
    ).toBe('essentials');
  });

  it('goes registration → essentials → room', () => {
    const beforeRegistrationComplete = {
      tourismRequired: true,
      tourismComplete: true,
      contactComplete: false,
    };
    expect(resolveNextStaySetupStep('registration', true, beforeRegistrationComplete)).toBe(null);
    expect(
      resolveNextStaySetupStep('registration', true, {
        tourismRequired: true,
        tourismComplete: true,
        contactComplete: true,
      })
    ).toBe('essentials');
    expect(
      resolveNextStaySetupStep('essentials', true, {
        ...beforeRegistrationComplete,
        contactComplete: true,
      })
    ).toBe('room');
    expect(
      resolveNextStaySetupStep('room', true, {
        tourismRequired: true,
        tourismComplete: true,
        contactComplete: true,
      })
    ).toBe(null);
  });

  it('keeps three steps in order', () => {
    expect(
      resolveStaySetupStepOrder(true, {
        tourismRequired: true,
        tourismComplete: true,
        contactComplete: true,
      })
    ).toEqual(['registration', 'essentials', 'room']);
  });

  it('maps legacy settlement url to room', () => {
    expect(normalizeStaySetupUrlStep('settlement')).toBe('room');
  });

  it('maps legacy register and contact to registration', () => {
    expect(normalizeStaySetupUrlStep('register')).toBe('registration');
    expect(normalizeStaySetupUrlStep('contact')).toBe('registration');
  });

  it('resolves previous step in order', () => {
    const completion = {
      tourismRequired: true,
      tourismComplete: true,
      contactComplete: true,
    };
    expect(resolvePreviousStaySetupStep('room', true, completion)).toBe('essentials');
    expect(resolvePreviousStaySetupStep('essentials', true, completion)).toBe('registration');
    expect(resolvePreviousStaySetupStep('registration', true, completion)).toBe(null);
  });

  it('returns null for previous on first step', () => {
    expect(
      resolvePreviousStaySetupStep('registration', false, {
        tourismRequired: false,
        tourismComplete: false,
        contactComplete: false,
      })
    ).toBe(null);
  });
});
