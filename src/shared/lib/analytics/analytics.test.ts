import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPostHogHost, isAnalyticsEnabled } from './config';

describe('analytics config', () => {
  const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const originalHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey;
    }

    if (originalHost === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_HOST = originalHost;
    }
  });

  it('is disabled without a PostHog key', () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it('is enabled when a PostHog key is set', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test';
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it('defaults to EU PostHog host', () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    expect(getPostHogHost()).toBe('https://eu.i.posthog.com');
  });
});

describe('trackLandingView', () => {
  it('does not throw on the server', async () => {
    const { trackLandingView } = await import('./events');
    expect(() => trackLandingView('demo')).not.toThrow();
  });
});

describe('initAnalytics', () => {
  it('does not throw without a PostHog key', async () => {
    const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;

    vi.stubGlobal('window', {} as Window);

    const { initAnalytics } = await import('./client');
    expect(() => initAnalytics('demo', 'landing')).not.toThrow();

    vi.unstubAllGlobals();

    if (originalKey === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey;
    }
  });
});
