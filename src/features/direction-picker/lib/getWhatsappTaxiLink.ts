import { HOSTEL_CONFIG } from '@/shared/config';
import { createWhatsappLink } from '@/shared/lib';

export function getWhatsappTaxiLink(message: string): string {
  return createWhatsappLink(HOSTEL_CONFIG.contacts.taxiPhone.raw ?? '', message);
}
