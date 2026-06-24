const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';

export function getPostHogKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || undefined;
}

export function getPostHogHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST;
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(getPostHogKey());
}
