import { describe, expect, it } from 'vitest';
import type { HostelConfig } from '@/entities/tenant/model/hostel-config';
import {
  hasStayEssentialContactBridgeContent,
  hasStayEssentialPublicContactContent,
} from './resolveStayEssentialContactContent';

function createHostel(overrides: Partial<HostelConfig> = {}): HostelConfig {
  return {
    booking: {
      provider: 'none',
      enabled: false,
      propertyUrl: null,
      paramKeys: { checkIn: 'checkin', checkOut: 'checkout', guests: 'guests', roomType: 'room' },
    },
    reception: {
      time: {},
      whatsapp: { href: '' },
      whatsappEnabled: false,
      canHelpWithTaxi: false,
    },
    sources: { recommendation: {} },
    wifi: {},
    contacts: {
      phone: { href: '' },
      taxiPhone: { href: '' },
      email: { href: '', display: '' },
      address: { display: '' },
      socials: {},
      guestChat: { href: '' },
      feedbackPhone: { href: '' },
    },
    ...overrides,
  };
}

describe('hasStayEssentialPublicContactContent', () => {
  it('is true when email is set', () => {
    const hostel = createHostel({
      contacts: {
        ...createHostel().contacts,
        email: { href: 'mailto:hi@hostel.com', display: 'hi@hostel.com' },
      },
    });

    expect(hasStayEssentialPublicContactContent(hostel)).toBe(true);
  });

  it('is false when only guest chat is configured', () => {
    const hostel = createHostel({
      reception: {
        time: {},
        whatsapp: { raw: '38761123456', href: 'tel:+38761123456' },
        whatsappEnabled: true,
        canHelpWithTaxi: false,
      },
    });

    expect(hasStayEssentialPublicContactContent(hostel)).toBe(false);
    expect(hasStayEssentialContactBridgeContent(hostel)).toBe(true);
  });
});

describe('hasStayEssentialContactBridgeContent', () => {
  it('is true for instagram only', () => {
    const hostel = createHostel({
      contacts: {
        ...createHostel().contacts,
        socials: { instagram: 'myhostel' },
      },
    });

    expect(hasStayEssentialContactBridgeContent(hostel)).toBe(true);
  });
});
