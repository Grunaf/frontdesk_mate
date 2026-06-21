import { resolvePhoneDisplay } from '@/shared/lib/phoneDisplay';
import type { HostelConfig } from '../model/hostel-config';
import type { TenantSettings } from '../model/settings';
import { resolveBookingConfig } from './resolveBookingConfig';

function telHref(raw?: string): string {
  return raw ? `tel:+${raw}` : '';
}

function mailHref(display?: string): string {
  return display ? `mailto:${display}` : '';
}

export function buildHostelConfig(settings: TenantSettings): HostelConfig {
  const contacts = settings.contacts ?? {};
  const receptionWhatsappRaw = settings.reception?.whatsappPhoneRaw ?? contacts.phoneRaw;
  const hasReceptionPhone = Boolean(contacts.phoneRaw || receptionWhatsappRaw);

  return {
    checkInTime: settings.checkInTime,
    checkOutTime: settings.checkOutTime,
    cityTax: settings.cityTax,
    selfCheckInTimeAfter: settings.selfCheckInTimeAfter,
    laundryCost: settings.laundryCost,
    booking: resolveBookingConfig(settings),
    heroBgUrl: settings.heroBgUrl,
    logoUrl: settings.logoUrl,
    reception: {
      time: {
        open: settings.reception?.open,
        close: settings.reception?.close,
      },
      whatsapp: {
        raw: receptionWhatsappRaw,
        mask: resolvePhoneDisplay(receptionWhatsappRaw, contacts.phoneMask),
        href: telHref(receptionWhatsappRaw),
      },
      whatsappEnabled:
        settings.reception?.whatsappEnabled !== false && Boolean(receptionWhatsappRaw),
      canHelpWithTaxi:
        settings.reception?.canHelpWithTaxi !== false && hasReceptionPhone,
      availabilityHint: settings.reception?.availabilityHint,
    },
    sources: {
      recommendation: {
        map: settings.recommendationMap,
      },
    },
    wifi: {
      name: settings.wifi?.name,
      password: settings.wifi?.password,
    },
    contacts: {
      phone: {
        raw: contacts.phoneRaw,
        mask: resolvePhoneDisplay(contacts.phoneRaw, contacts.phoneMask),
        href: telHref(contacts.phoneRaw),
      },
      taxiPhone: {
        raw: contacts.taxiPhoneRaw,
        mask: resolvePhoneDisplay(contacts.taxiPhoneRaw, contacts.taxiPhoneMask),
        href: telHref(contacts.taxiPhoneRaw),
      },
      email: {
        display: contacts.email,
        href: mailHref(contacts.email),
      },
      address: {
        display: contacts.address,
        googleMapsHref: contacts.mapsUrl,
      },
      socials: {
        instagram: contacts.instagram,
        facebook: contacts.facebook,
      },
      feedbackPhone: {
        raw: contacts.feedbackPhoneRaw ?? contacts.phoneRaw,
        mask: resolvePhoneDisplay(
          contacts.feedbackPhoneRaw ?? contacts.phoneRaw,
          contacts.phoneMask
        ),
        href: telHref(contacts.feedbackPhoneRaw ?? contacts.phoneRaw),
      },
    },
  };
}
