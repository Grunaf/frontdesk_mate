import type { HostelConfig } from '@/entities/tenant/model/hostel-config';
import {
  resolveFacebookHref,
  resolveGuestChatHref,
  resolveInstagramHref,
} from '../lib/resolveSocialHref';

export interface StayEssentialPublicContactContent {
  emailHref: string | null;
  instagramHref: string | null;
  facebookHref: string | null;
}

export interface StayEssentialContactContent {
  public: StayEssentialPublicContactContent;
  /** Configured guest chat URL or reception WhatsApp when enabled. */
  guestChatConfigured: boolean;
  guestChatUrl: string | null;
}

function resolveConfiguredGuestChat(hostel: HostelConfig): string | null {
  return resolveGuestChatHref(hostel.contacts.guestChat.href);
}

export function resolveReceptionWhatsappAvailable(hostel: HostelConfig): boolean {
  return Boolean(hostel.reception.whatsappEnabled && hostel.reception.whatsapp.raw?.trim());
}

export function resolveStayEssentialContactContent(hostel: HostelConfig): StayEssentialContactContent {
  const emailHref = hostel.contacts.email.href?.trim() || null;
  const instagramHref = resolveInstagramHref(hostel.contacts.socials.instagram);
  const facebookHref = resolveFacebookHref(hostel.contacts.socials.facebook);
  const guestChatUrl = resolveConfiguredGuestChat(hostel);
  const guestChatConfigured = Boolean(guestChatUrl || resolveReceptionWhatsappAvailable(hostel));

  return {
    public: {
      emailHref,
      instagramHref,
      facebookHref,
    },
    guestChatConfigured,
    guestChatUrl,
  };
}

export function hasStayEssentialPublicContactContent(hostel: HostelConfig): boolean {
  const { public: publicContent } = resolveStayEssentialContactContent(hostel);

  return Boolean(
    publicContent.emailHref ||
      publicContent.instagramHref ||
      publicContent.facebookHref
  );
}

export function hasStayEssentialContactBridgeContent(hostel: HostelConfig): boolean {
  const content = resolveStayEssentialContactContent(hostel);

  return hasStayEssentialPublicContactContent(hostel) || content.guestChatConfigured;
}
