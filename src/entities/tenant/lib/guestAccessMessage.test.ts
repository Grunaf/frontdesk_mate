import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE,
  DEFAULT_GUEST_ACCESS_PIN_MISSING_TEXT,
} from './guestAccessMessage';

describe('guestAccessMessage defaults', () => {
  it('mentions arrival guide link and Concierge Check in', () => {
    expect(DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE).toContain('{sendLink}');
    expect(DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE).toMatch(/Check in/i);
    expect(DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE).toContain('Concierge');
  });

  it('guides PIN recovery via Check in chip', () => {
    expect(DEFAULT_GUEST_ACCESS_PIN_MISSING_TEXT).toMatch(/Check in/i);
  });
});
