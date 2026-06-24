'use client';

import { captureAnalyticsEvent } from './client';
import type {
  AnalyticsSite,
  BookingWhatsappPlacement,
  ReceptionContactChannel,
  ReceptionContactContext,
} from './types';

function baseProps(site: AnalyticsSite, tenantSlug: string): Record<string, string> {
  return {
    tenant_slug: tenantSlug,
    site,
  };
}

export function trackLandingView(tenantSlug: string): void {
  captureAnalyticsEvent('landing_view', baseProps('landing', tenantSlug));
}

export function trackBookingWhatsappClick(
  tenantSlug: string,
  placement: BookingWhatsappPlacement
): void {
  captureAnalyticsEvent('booking_whatsapp_click', {
    ...baseProps('landing', tenantSlug),
    placement,
  });
}

export function trackCheckInSuccess(tenantSlug: string): void {
  captureAnalyticsEvent('check_in_success', baseProps('app', tenantSlug));
}

export function trackReceptionContactClick(
  tenantSlug: string,
  context: ReceptionContactContext,
  channel: ReceptionContactChannel
): void {
  captureAnalyticsEvent('reception_contact_click', {
    ...baseProps('app', tenantSlug),
    context,
    channel,
  });
}
