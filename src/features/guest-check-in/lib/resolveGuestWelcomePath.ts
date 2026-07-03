export type GuestEntryParam = 'remote' | 'door' | 'desk';

export type WelcomeStep = 'info' | 'route' | 'arrival' | 'settlement';

export function parseGuestEntryParam(value: string | null | undefined): GuestEntryParam | null {
  if (value === 'remote' || value === 'door' || value === 'desk') {
    return value;
  }

  return null;
}

export function resolveWelcomeStep(input: {
  entry?: GuestEntryParam | null;
  modeOnsite?: boolean;
}): WelcomeStep {
  const { entry, modeOnsite } = input;

  if (entry === 'desk') {
    return 'settlement';
  }

  if (entry === 'door' || modeOnsite) {
    return 'arrival';
  }

  if (entry === 'remote') {
    return 'info';
  }

  return 'route';
}

export function resolveGuestWelcomePath(input: {
  locale: string;
  entry?: GuestEntryParam | null;
  modeOnsite?: boolean;
}): string {
  const step = resolveWelcomeStep(input);
  const params = new URLSearchParams({ step });

  if (input.modeOnsite) {
    params.set('mode', 'onsite');
  }

  return `/${input.locale}/welcome?${params.toString()}`;
}
