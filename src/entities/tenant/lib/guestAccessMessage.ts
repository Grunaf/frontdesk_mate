import type { TenantSettings } from '../model/settings';

export const DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE = `Hi {guestName},

Before you travel, open this link for directions and arrival tips:
{sendLink}

To unlock door codes and your room map, open the guest app on Concierge and tap Check in (top right), then use your PIN or personal link:
{pinOrHelp}`;

export const DEFAULT_GUEST_ACCESS_PIN_MISSING_TEXT =
  'Open the guest app, tap Check in on Concierge (top right), and enter the 6-digit PIN from your slip — or message us if you need help.';

export function resolveGuestAccessMessageTemplate(settings?: TenantSettings): string {
  const custom = settings?.reception?.guestAccessMessageTemplate?.trim();
  return custom || DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE;
}

export function resolveGuestAccessPinMissingText(settings?: TenantSettings): string {
  const custom = settings?.reception?.guestAccessPinMissingText?.trim();
  return custom || DEFAULT_GUEST_ACCESS_PIN_MISSING_TEXT;
}
