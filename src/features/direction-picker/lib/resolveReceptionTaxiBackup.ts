import type { HostelConfig } from '@/entities/tenant';
import { resolveReceptionContact, type ResolvedReceptionContact } from '@/entities/tenant/lib/resolveReceptionContact';

export function resolveReceptionTaxiBackup(
  hostel: HostelConfig,
  message: string,
  translate: (key: string, params?: Record<string, string>) => string
): ResolvedReceptionContact | null {
  if (!hostel.reception.canHelpWithTaxi) {
    return null;
  }

  return resolveReceptionContact(hostel, {
    message,
    urgency: 'high',
    translate,
  });
}
