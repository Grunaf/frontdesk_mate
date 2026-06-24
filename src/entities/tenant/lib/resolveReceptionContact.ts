import type { HostelConfig } from '../model/hostel-config';
import { resolveReceptionAvailabilityHint } from './resolveReceptionAvailabilityHint';
import { createWhatsappLink } from '@/shared/lib';

export type ReceptionContactUrgency = 'low' | 'high';

export interface ResolvedReceptionContact {
  whatsappHref: string | null;
  telHref: string | null;
  availabilityHint: string | null;
}

type TranslateFn = (key: string, params?: Record<string, string>) => string;

export interface ResolveReceptionContactOptions {
  message: string;
  urgency: ReceptionContactUrgency;
  translate?: TranslateFn;
}

export function resolveReceptionContact(
  hostel: HostelConfig,
  { message, urgency, translate }: ResolveReceptionContactOptions
): ResolvedReceptionContact | null {
  const whatsappPhone = hostel.reception.whatsapp.raw;
  const whatsappHref =
    hostel.reception.whatsappEnabled && whatsappPhone
      ? createWhatsappLink(whatsappPhone, message)
      : null;

  const phoneHref = hostel.contacts.phone.href || null;
  const telHref =
    urgency === 'high'
      ? phoneHref
      : !whatsappHref && phoneHref
        ? phoneHref
        : null;

  if (!whatsappHref && !telHref) {
    return null;
  }

  return {
    whatsappHref,
    telHref,
    availabilityHint: translate
      ? resolveReceptionAvailabilityHint(hostel.reception, translate)
      : null,
  };
}
