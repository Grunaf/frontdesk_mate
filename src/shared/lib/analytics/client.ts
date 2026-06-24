'use client';

import posthog from 'posthog-js';
import { getPostHogHost, getPostHogKey, isAnalyticsEnabled } from './config';
import type { AnalyticsEventName, AnalyticsSite } from './types';

let initialized = false;

export function initAnalytics(tenantSlug: string, site: AnalyticsSite): void {
  if (initialized || typeof window === 'undefined' || !isAnalyticsEnabled()) {
    return;
  }

  const key = getPostHogKey();
  if (!key) {
    return;
  }

  posthog.init(key, {
    api_host: getPostHogHost(),
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    persistence: 'memory',
    person_profiles: 'never',
  });

  posthog.register({
    tenant_slug: tenantSlug,
    site,
  });

  initialized = true;
}

export function captureAnalyticsEvent(
  event: AnalyticsEventName,
  properties?: Record<string, string>
): void {
  if (!initialized || typeof window === 'undefined' || !isAnalyticsEnabled()) {
    return;
  }

  posthog.capture(event, properties);
}
