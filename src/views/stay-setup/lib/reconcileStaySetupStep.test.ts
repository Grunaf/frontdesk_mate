import { describe, expect, it } from 'vitest';
import {
  isStaySetupUrlSyncedWithStep,
  mergeRegistrationStatusMonotonic,
  reconcileStepAfterCompletionSync,
  resolveStaySetupStepFromUrl,
  shouldIgnoreConflictingUrlStep,
} from './reconcileStaySetupStep';

describe('reconcileStepAfterCompletionSync', () => {
  const complete = {
    tourismRequired: true,
    tourismComplete: true,
    contactComplete: true,
  };

  it('keeps registration step when sync runs on registration', () => {
    expect(reconcileStepAfterCompletionSync('registration', true, complete, true)).toBe(
      'registration'
    );
  });

  it('does not rewind room to essentials when sync runs after forward nav', () => {
    expect(reconcileStepAfterCompletionSync('room', true, complete, true)).toBe('room');
  });

  it('sends guest back to registration when sync shows registration incomplete', () => {
    expect(
      reconcileStepAfterCompletionSync(
        'room',
        true,
        { tourismRequired: true, tourismComplete: true, contactComplete: false },
        true
      )
    ).toBe('registration');
  });
});

describe('mergeRegistrationStatusMonotonic', () => {
  it('never clears completion flags from a stale server response', () => {
    expect(
      mergeRegistrationStatusMonotonic(
        { tourismComplete: true, contactComplete: true },
        { tourismComplete: false, contactComplete: false }
      )
    ).toEqual({ tourismComplete: true, contactComplete: true });
  });
});

describe('shouldIgnoreConflictingUrlStep', () => {
  it('ignores stale essentials url while on room', () => {
    expect(shouldIgnoreConflictingUrlStep('essentials', 'room')).toBe(true);
  });

  it('ignores stale room url while on essentials', () => {
    expect(shouldIgnoreConflictingUrlStep('room', 'essentials')).toBe(true);
  });
});

describe('isStaySetupUrlSyncedWithStep', () => {
  it('treats missing step query as synced only for registration', () => {
    expect(isStaySetupUrlSyncedWithStep(null, 'registration')).toBe(true);
    expect(isStaySetupUrlSyncedWithStep(null, 'essentials')).toBe(false);
  });
});

describe('resolveStaySetupStepFromUrl', () => {
  const completion = {
    tourismRequired: true,
    tourismComplete: true,
    contactComplete: true,
  };

  it('honors user intent over stale essentials url', () => {
    expect(
      resolveStaySetupStepFromUrl({
        urlStep: 'essentials',
        isRegistered: true,
        tourismRegistrationRequired: true,
        completion,
        checkInDayOrLater: true,
        registrationComplete: true,
        contactComplete: true,
        currentStep: 'registration',
        userIntentStep: 'registration',
      })
    ).toBe('registration');
  });

  it('keeps registration when url says registration', () => {
    expect(
      resolveStaySetupStepFromUrl({
        urlStep: 'registration',
        isRegistered: true,
        tourismRegistrationRequired: true,
        completion,
        checkInDayOrLater: true,
        registrationComplete: true,
        contactComplete: true,
        currentStep: 'essentials',
        userIntentStep: null,
      })
    ).toBe('registration');
  });

  it('does not apply stale essentials url while on registration', () => {
    expect(
      resolveStaySetupStepFromUrl({
        urlStep: 'essentials',
        isRegistered: true,
        tourismRegistrationRequired: true,
        completion,
        checkInDayOrLater: true,
        registrationComplete: true,
        contactComplete: true,
        currentStep: 'registration',
        userIntentStep: null,
      })
    ).toBe(null);
  });

  it('does not apply stale essentials url while on room', () => {
    expect(
      resolveStaySetupStepFromUrl({
        urlStep: 'essentials',
        isRegistered: true,
        tourismRegistrationRequired: true,
        completion,
        checkInDayOrLater: true,
        registrationComplete: true,
        contactComplete: true,
        currentStep: 'room',
        userIntentStep: null,
      })
    ).toBe(null);
  });
});
