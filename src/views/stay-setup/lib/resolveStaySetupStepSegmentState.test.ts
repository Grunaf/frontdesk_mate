import { describe, expect, it } from 'vitest';
import { resolveStaySetupStepSegmentState } from './resolveStaySetupStepSegmentState';

describe('resolveStaySetupStepSegmentState', () => {
  const withTourism = {
    tourismRequired: true,
    tourismComplete: true,
    contactComplete: false,
  };

  it('marks current step', () => {
    expect(resolveStaySetupStepSegmentState('contact', 'contact', withTourism, false)).toBe(
      'current'
    );
  });

  it('marks register completed when tourism done', () => {
    expect(resolveStaySetupStepSegmentState('register', 'contact', withTourism, false)).toBe(
      'completed'
    );
  });

  it('marks room locked when gate applies', () => {
    expect(resolveStaySetupStepSegmentState('room', 'contact', withTourism, true)).toBe('locked');
  });

  it('marks upcoming for incomplete prior step when not locked', () => {
    expect(resolveStaySetupStepSegmentState('room', 'register', withTourism, false)).toBe(
      'upcoming'
    );
  });

  it('marks contact completed after whatsapp saved', () => {
    expect(
      resolveStaySetupStepSegmentState(
        'contact',
        'essentials',
        { ...withTourism, contactComplete: true },
        false
      )
    ).toBe('completed');
  });

  it('marks essentials completed on room step', () => {
    expect(
      resolveStaySetupStepSegmentState(
        'essentials',
        'room',
        { ...withTourism, contactComplete: true },
        false
      )
    ).toBe('completed');
  });
});
