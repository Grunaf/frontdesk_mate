import { describe, expect, it } from 'vitest';
import type { GuestStayPlan } from '@/entities/tenant';
import {
  buildExtendStayWhatsappMessage,
  resolveGuestStayBedLabel,
} from './buildExtendStayWhatsappMessage';

const plan: GuestStayPlan = {
  bedId: '12',
  bedLabel: '12',
  bedSlot: 12,
  bedTier: undefined,
  room: null,
  floor: null,
  layoutBeds: [],
  roomBounds: null,
  steps: [],
  hasContent: true,
};

describe('resolveGuestStayBedLabel', () => {
  it('returns bed slot label', () => {
    expect(
      resolveGuestStayBedLabel(plan, (key, values) => {
        if (key === 'bedLabel') return `Bed ${values?.bed}`;
        return key;
      })
    ).toBe('12');
  });
});

describe('buildExtendStayWhatsappMessage', () => {
  it('includes hostel, bed, checkout, and ref in composed message', () => {
    const message = buildExtendStayWhatsappMessage({
      hostelName: 'Vega',
      bedLabel: '12',
      checkOutAt: '2026-06-25T10:00:00.000Z',
      locale: 'en',
      stayRef: 'A3F2B1',
      guestName: null,
      composeMessage: (_key, values) =>
        `Extend at ${values.hostelName}, bed ${values.bedLabel}, until ${values.checkoutDate}, ref ${values.stayRef}`,
    });

    expect(message).toContain('Vega');
    expect(message).toContain('12');
    expect(message).toMatch(/25/);
    expect(message).toContain('A3F2B1');
  });

  it('uses named template when guest name is set', () => {
    const message = buildExtendStayWhatsappMessage({
      hostelName: 'Vega',
      bedLabel: '12',
      checkOutAt: '2026-06-25T10:00:00.000Z',
      locale: 'en',
      stayRef: 'A3F2B1',
      guestName: 'Alex',
      composeMessage: (key, values) =>
        key === 'extendStayMessageNamed'
          ? `Named ${values.guestName}, ref ${values.stayRef}`
          : 'anonymous',
    });

    expect(message).toBe('Named Alex, ref A3F2B1');
  });
});
