import { describe, expect, it } from 'vitest';
import { resolveGuestBookingPhone } from './resolveGuestBookingPhone';

describe('resolveGuestBookingPhone', () => {
  it('uses reception phone by default', () => {
    expect(
      resolveGuestBookingPhone({
        contacts: { phoneRaw: '38761123456' },
      })
    ).toBe('38761123456');
  });

  it('prefers booking override when set', () => {
    expect(
      resolveGuestBookingPhone({
        contacts: {
          phoneRaw: '38761123456',
          bookingWhatsappPhoneRaw: '38760999888',
        },
      })
    ).toBe('38760999888');
  });
});
