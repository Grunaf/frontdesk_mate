import { describe, expect, it } from 'vitest';
import { guestEntryToIntent, guestIntentToEntry } from './guestIntent';

describe('guestIntentToEntry', () => {
  it('maps intents to entry params', () => {
    expect(guestIntentToEntry('planning')).toBe('remote');
    expect(guestIntentToEntry('at_door')).toBe('door');
    expect(guestIntentToEntry('at_desk')).toBe('desk');
  });
});

describe('guestEntryToIntent', () => {
  it('maps entry params to intents', () => {
    expect(guestEntryToIntent('remote')).toBe('planning');
    expect(guestEntryToIntent('door')).toBe('at_door');
    expect(guestEntryToIntent('desk')).toBe('at_desk');
  });
});
