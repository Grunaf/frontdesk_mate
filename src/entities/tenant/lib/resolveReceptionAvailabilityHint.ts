import type { HostelConfig } from '../model/hostel-config';

type TranslateFn = (key: string, params?: Record<string, string>) => string;

export function resolveReceptionAvailabilityHint(
  reception: HostelConfig['reception'],
  translate: TranslateFn
): string | null {
  if (reception.availabilityHint?.trim()) {
    return reception.availabilityHint.trim();
  }

  const { open, close } = reception.time;

  if (open && close && open !== close) {
    return translate('askReceptionHoursHint', { open, close });
  }

  if (open) {
    return translate('askReceptionOpensHint', { open });
  }

  return null;
}
