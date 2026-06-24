import { describe, expect, it, vi } from 'vitest';
import { buildGuestExtraWhatsappMessage } from './buildGuestExtraWhatsappMessage';

describe('buildGuestExtraWhatsappMessage', () => {
  it('builds laundry message', () => {
    const composeMessage = vi.fn((key) => `${key}:Bed 3:A1B2C3`);
    expect(
      buildGuestExtraWhatsappMessage({
        presetId: 'laundry',
        hostelName: 'Vega',
        bedLabel: 'Bed 3',
        stayRef: 'A1B2C3',
        composeMessage,
      })
    ).toBe('laundryMessage:Bed 3:A1B2C3');
  });
});
