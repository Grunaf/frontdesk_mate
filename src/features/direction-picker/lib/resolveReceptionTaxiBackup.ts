import type { HostelConfig } from '@/entities/tenant';
import { resolveReceptionAvailabilityHint } from '@/entities/tenant/lib/resolveReceptionAvailabilityHint';
import { createWhatsappLink } from '@/shared/lib';

export interface ResolvedReceptionTaxiBackup {
  whatsappHref: string | null;
  telHref: string | null;
  availabilityHint: string | null;
}

export function resolveReceptionTaxiBackup(
  hostel: HostelConfig,
  message: string,
  translate: (key: string, params?: Record<string, string>) => string
): ResolvedReceptionTaxiBackup | null {
  if (!hostel.reception.canHelpWithTaxi) {
    return null;
  }

  const whatsappPhone = hostel.reception.whatsapp.raw;
  const callPhone = hostel.contacts.phone.raw;

  const whatsappHref =
    hostel.reception.whatsappEnabled && whatsappPhone
      ? createWhatsappLink(whatsappPhone, message)
      : null;

  const telHref = !whatsappHref && callPhone ? hostel.contacts.phone.href : null;

  if (!whatsappHref && !telHref) {
    return null;
  }

  return {
    whatsappHref,
    telHref,
    availabilityHint: resolveReceptionAvailabilityHint(hostel.reception, translate),
  };
}
