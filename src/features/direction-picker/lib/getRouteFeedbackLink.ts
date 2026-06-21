import { createWhatsappLink } from '@/shared/lib';

export function getRouteFeedbackLink(phone: string, message: string): string {
  return createWhatsappLink(phone, message);
}
