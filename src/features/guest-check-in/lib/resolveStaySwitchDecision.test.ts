import { describe, expect, it } from 'vitest';
import { resolveStaySwitchDecision } from './resolveStaySwitchDecision';

describe('resolveStaySwitchDecision', () => {
  it('activates when there is no current session', () => {
    expect(
      resolveStaySwitchDecision({ currentStayId: null, incomingStayId: 'stay-b' })
    ).toBe('activate');
    expect(
      resolveStaySwitchDecision({ currentStayId: undefined, incomingStayId: 'stay-b' })
    ).toBe('activate');
  });

  it('continues when the incoming stay matches the session', () => {
    expect(
      resolveStaySwitchDecision({ currentStayId: 'stay-a', incomingStayId: 'stay-a' })
    ).toBe('continue');
  });

  it('confirms when the incoming stay differs', () => {
    expect(
      resolveStaySwitchDecision({ currentStayId: 'stay-a', incomingStayId: 'stay-b' })
    ).toBe('confirm');
  });
});
