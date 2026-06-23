import { describe, expect, it } from 'vitest';
import { buildServiceWhatsappMessage } from './buildServiceWhatsappMessage';

describe('buildServiceWhatsappMessage', () => {
  const compose = (key: string, values: Record<string, string>) =>
    `${key}:${values.bedLabel}:${values.stayRef}`;

  it('builds laundry message', () => {
    expect(
      buildServiceWhatsappMessage({
        serviceId: 'laundry',
        hostelName: 'Vega',
        bedLabel: 'Bed 3',
        stayRef: 'A1B2C3',
        composeMessage: compose,
      })
    ).toBe('laundryMessage:Bed 3:A1B2C3');
  });

  it('builds late checkout message', () => {
    expect(
      buildServiceWhatsappMessage({
        serviceId: 'late_checkout',
        hostelName: 'Vega',
        bedLabel: 'Bed 3',
        stayRef: 'A1B2C3',
        checkoutTime: '11:00',
        composeMessage: compose,
      })
    ).toBe('lateCheckoutMessage:Bed 3:A1B2C3');
  });
});
