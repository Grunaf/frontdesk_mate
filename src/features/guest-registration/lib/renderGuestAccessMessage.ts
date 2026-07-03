export interface GuestAccessMessageContext {
  sendLink: string;
  pin?: string | null;
  pinMissingText: string;
  guestName?: string;
  hostelName: string;
  bedLabel: string;
}

function formatGuestPinForMessage(pin: string): string {
  const digits = pin.replace(/\D/g, '');
  if (digits.length !== 6) return pin.trim();
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

function resolvePinOrHelp(ctx: GuestAccessMessageContext): string {
  if (ctx.pin?.trim()) {
    return formatGuestPinForMessage(ctx.pin);
  }
  return ctx.pinMissingText.trim();
}

function resolveGuestNameLabel(name: string | undefined): string {
  const trimmed = name?.trim();
  return trimmed || 'Guest';
}

const PLACEHOLDER_PATTERN = /\{(sendLink|pin|pinOrHelp|guestName|hostelName|bedLabel)\}/g;

export function collapseGuestAccessMessage(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/\s{2,}/g, ' ').trim())
    .filter((line) => line.length > 0 && !/^[^:]+:\s*$/.test(line))
    .join('\n');
}

export function renderGuestAccessMessage(
  template: string,
  ctx: GuestAccessMessageContext
): string {
  const pinOrHelp = resolvePinOrHelp(ctx);
  const guestName = resolveGuestNameLabel(ctx.guestName);

  const values: Record<string, string> = {
    sendLink: ctx.sendLink.trim(),
    pin: pinOrHelp,
    pinOrHelp,
    guestName,
    hostelName: ctx.hostelName.trim(),
    bedLabel: ctx.bedLabel.trim(),
  };

  const rendered = template.replace(PLACEHOLDER_PATTERN, (_, key: string) => values[key] ?? '');
  return collapseGuestAccessMessage(rendered);
}
