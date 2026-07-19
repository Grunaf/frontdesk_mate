import { describe, expect, it } from 'vitest';
import {
  isStaySetupSettlementUnlocked,
  isStaySetupStepLocked,
  normalizeStaySetupUrlStep,
  resolveFirstIncompleteStaySetupStep,
  resolveStaySetupCoordinatorStep,
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
        entryDateComplete: true,
        contactComplete: false,
        passportVerified: false,
      })
    ).toBe('registration');
  });

  it('stays on registration when tourism complete but entry date incomplete', () => {
    expect(
      resolveFirstIncompleteStaySetupStep(true, {
        tourismRequired: true,
        tourismComplete: true,
        entryDateComplete: false,
        contactComplete: true,
        passportVerified: true,
      })
    ).toBe('registration');
  });

  it('stays on registration when tourism complete but contact incomplete', () => {
    expect(
      resolveFirstIncompleteStaySetupStep(true, {
        tourismRequired: true,
        tourismComplete: true,
        entryDateComplete: true,
        contactComplete: false,
        passportVerified: false,
      })
    ).toBe('registration');
  });

  it('stays on registration when forms complete but passport not verified', () => {
    expect(
      resolveFirstIncompleteStaySetupStep(true, {
        tourismRequired: true,
        tourismComplete: true,
        entryDateComplete: true,
        contactComplete: true,
        passportVerified: false,
      })
    ).toBe('registration');
  });

  it('stays on registration when tourism off, contact complete, passport not verified', () => {
    expect(
      resolveFirstIncompleteStaySetupStep(false, {
        tourismRequired: false,
        tourismComplete: false,
        entryDateComplete: true,
        contactComplete: true,
        passportVerified: false,
      })
    ).toBe('registration');
  });

  it('lands on essentials when registration aggregate complete and passport verified', () => {
    expect(
      resolveFirstIncompleteStaySetupStep(true, {
        tourismRequired: true,
        tourismComplete: true,
        entryDateComplete: true,
        contactComplete: true,
        passportVerified: true,
      })
    ).toBe('essentials');
  });

  it('goes registration → essentials → room only after passport verified', () => {
    const beforePassport = {
      tourismRequired: true,
      tourismComplete: true,
      entryDateComplete: true,
      contactComplete: true,
      passportVerified: false,
    };
    expect(resolveNextStaySetupStep('registration', true, beforePassport)).toBe(null);
    expect(
      resolveNextStaySetupStep('registration', true, {
        ...beforePassport,
        passportVerified: true,
      })
    ).toBe('essentials');
    expect(
      resolveNextStaySetupStep('essentials', true, {
        ...beforePassport,
        passportVerified: true,
      })
    ).toBe('room');
    expect(
      resolveNextStaySetupStep('room', true, {
        ...beforePassport,
        passportVerified: true,
      })
    ).toBe(null);
  });

  it('keeps three steps in order', () => {
    expect(
      resolveStaySetupStepOrder(true, {
        tourismRequired: true,
        tourismComplete: true,
        entryDateComplete: true,
        contactComplete: true,
        passportVerified: true,
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
      entryDateComplete: true,
      contactComplete: true,
      passportVerified: true,
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
        entryDateComplete: true,
        contactComplete: false,
        passportVerified: false,
      })
    ).toBe(null);
  });

  it('keeps registration before check-in day when registration is complete', () => {
    const completion = {
      tourismRequired: true,
      tourismComplete: true,
      entryDateComplete: true,
      contactComplete: true,
      passportVerified: true,
    };
    expect(resolveStaySetupCoordinatorStep(true, completion, false)).toBe('registration');
    expect(resolveStaySetupCoordinatorStep(true, completion, true)).toBe('essentials');
  });

  it('keeps registration on check-in day until passport verified', () => {
    const completion = {
      tourismRequired: true,
      tourismComplete: true,
      entryDateComplete: true,
      contactComplete: true,
      passportVerified: false,
    };
    expect(resolveStaySetupCoordinatorStep(true, completion, true)).toBe('registration');
  });

  it('locks bed/room until passport verified even when forms complete', () => {
    const completion = {
      tourismRequired: true,
      tourismComplete: true,
      entryDateComplete: true,
      contactComplete: true,
      passportVerified: false,
    };
    expect(isStaySetupSettlementUnlocked(completion)).toBe(false);
    expect(isStaySetupStepLocked('room', true, true, completion, true)).toBe(true);
    expect(isStaySetupStepLocked('essentials', true, true, completion, true)).toBe(true);
  });

  it('unlocks bed/room when passport verified on check-in day', () => {
    const completion = {
      tourismRequired: false,
      tourismComplete: false,
      entryDateComplete: true,
      contactComplete: true,
      passportVerified: true,
    };
    expect(isStaySetupSettlementUnlocked(completion)).toBe(true);
    expect(isStaySetupStepLocked('room', true, false, completion, true)).toBe(false);
  });
});
