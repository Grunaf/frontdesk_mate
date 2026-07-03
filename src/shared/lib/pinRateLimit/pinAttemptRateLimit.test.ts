import { afterEach, describe, expect, it } from 'vitest';
import { PIN_RATE_LIMIT_MAX_FAILURES } from './config';
import {
  isPinAttemptRateLimited,
  recordPinAttemptFailure,
  resetPinRateLimitMemoryForTests,
} from './pinAttemptRateLimit';

describe('pinAttemptRateLimit (memory)', () => {
  afterEach(() => {
    resetPinRateLimitMemoryForTests();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('blocks after max failures', async () => {
    const input = { scope: 'guest' as const, tenantSlug: 'vega', clientIp: '1.2.3.4' };

    for (let i = 0; i < PIN_RATE_LIMIT_MAX_FAILURES; i += 1) {
      expect(await isPinAttemptRateLimited(input)).toBe(false);
      await recordPinAttemptFailure(input);
    }

    expect(await isPinAttemptRateLimited(input)).toBe(true);
  });
});
