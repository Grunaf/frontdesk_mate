import { describe, expect, it } from 'vitest';
import { guestIntentToEntry } from './guestIntent';

describe('guestIntentToEntry', () => {
  it('maps intents to entry params', () => {
    expect(guestIntentToEntry('planning')).toBe('remote');
    expect(guestIntentToEntry('at_door')).toBe('door');
    expect(guestIntentToEntry('at_desk')).toBe('desk');
  });
});
