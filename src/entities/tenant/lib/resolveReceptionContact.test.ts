import { describe, expect, it } from 'vitest';
import type { HostelConfig } from '../model/hostel-config';
import { resolveReceptionContact } from './resolveReceptionContact';

function buildHostel(overrides: {
  whatsappEnabled?: boolean;
  whatsappRaw?: string;
  phoneHref?: string;
}): HostelConfig {
  return {
    booking: { mode: 'disabled' },
    reception: {
      time: {},
      whatsapp: {
        raw: overrides.whatsappRaw,
        mask: '',
        href: overrides.whatsappRaw ? `tel:+${overrides.whatsappRaw}` : '',
      },
      whatsappEnabled: overrides.whatsappEnabled ?? true,
      canHelpWithTaxi: true,
    },
    sources: { recommendation: {} },
    wifi: {},
    contacts: {
      phone: {
        raw: overrides.phoneHref?.replace('tel:+', ''),
        mask: '',
        href: overrides.phoneHref ?? '',
      },
      taxiPhone: { raw: '', mask: '', href: '' },
      email: { href: '' },
      address: {},
      socials: {},
      feedbackPhone: { raw: '', mask: '', href: '' },
    },
  } as HostelConfig;
}

describe('resolveReceptionContact', () => {
  const message = 'Hello reception';

  it('returns WhatsApp only for low urgency when WhatsApp is enabled', () => {
    const result = resolveReceptionContact(
      buildHostel({
        whatsappRaw: '38761123456',
        phoneHref: 'tel:+38769999999',
      }),
      { message, urgency: 'low' }
    );

    expect(result?.whatsappHref).toContain('wa.me/38761123456');
    expect(result?.telHref).toBeNull();
  });

  it('returns tel fallback for low urgency when WhatsApp is disabled', () => {
    const result = resolveReceptionContact(
      buildHostel({
        whatsappEnabled: false,
        phoneHref: 'tel:+38769999999',
      }),
      { message, urgency: 'low' }
    );

    expect(result?.whatsappHref).toBeNull();
    expect(result?.telHref).toBe('tel:+38769999999');
  });

  it('returns WhatsApp and tel together for high urgency', () => {
    const result = resolveReceptionContact(
      buildHostel({
        whatsappRaw: '38761123456',
        phoneHref: 'tel:+38769999999',
      }),
      { message, urgency: 'high' }
    );

    expect(result?.whatsappHref).toContain('wa.me/38761123456');
    expect(result?.telHref).toBe('tel:+38769999999');
  });

  it('returns tel only for high urgency when WhatsApp is disabled', () => {
    const result = resolveReceptionContact(
      buildHostel({
        whatsappEnabled: false,
        phoneHref: 'tel:+38769999999',
      }),
      { message, urgency: 'high' }
    );

    expect(result?.whatsappHref).toBeNull();
    expect(result?.telHref).toBe('tel:+38769999999');
  });

  it('returns null when no channels are configured', () => {
    const result = resolveReceptionContact(
      buildHostel({ whatsappEnabled: false, phoneHref: '' }),
      { message, urgency: 'high' }
    );

    expect(result).toBeNull();
  });

  it('includes prefilled message in WhatsApp link', () => {
    const result = resolveReceptionContact(
      buildHostel({ whatsappRaw: '38761123456' }),
      { message: 'Need check-in link', urgency: 'low' }
    );

    expect(result?.whatsappHref).toContain(encodeURIComponent('Need check-in link'));
  });
});
