import { describe, expect, it } from 'vitest';
import { resolveStaySetupStepSegmentState } from './resolveStaySetupStepSegmentState';

describe('resolveStaySetupStepSegmentState', () => {
  const registrationIncomplete = {
    tourismRequired: true,
    tourismComplete: true,
    entryDateComplete: true,
    contactComplete: false,
    passportVerified: false,
  };

  it('marks current step', () => {
    expect(
      resolveStaySetupStepSegmentState('registration', 'registration', registrationIncomplete, false)
    ).toBe('current');
  });

  it('marks registration completed when aggregate done', () => {
    expect(
      resolveStaySetupStepSegmentState(
        'registration',
        'essentials',
        { ...registrationIncomplete, contactComplete: true },
        false
      )
    ).toBe('completed');
  });

  it('marks room locked when gate applies', () => {
    expect(resolveStaySetupStepSegmentState('room', 'registration', registrationIncomplete, true)).toBe(
      'locked'
    );
  });

  it('marks upcoming for incomplete prior step when not locked', () => {
    expect(resolveStaySetupStepSegmentState('room', 'registration', registrationIncomplete, false)).toBe(
      'upcoming'
    );
  });

  it('marks essentials completed on room step', () => {
    expect(
      resolveStaySetupStepSegmentState(
        'essentials',
        'room',
        { ...registrationIncomplete, contactComplete: true },
        false
      )
    ).toBe('completed');
  });
});
