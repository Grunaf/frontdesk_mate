import {
  PIN_RATE_LIMIT_BLOCK_SEC,
  PIN_RATE_LIMIT_MAX_FAILURES,
  PIN_RATE_LIMIT_WINDOW_SEC,
  type PinRateLimitScope,
} from './config';

function normalizeRateLimitSubject(subject: string | undefined): string | undefined {
  const trimmed = subject?.trim();
  if (!trimmed) return undefined;
  return trimmed.toLowerCase();
}

function rateLimitIdentity(clientIp: string, subject?: string): string {
  return normalizeRateLimitSubject(subject) ?? clientIp;
}

function failKey(
  scope: PinRateLimitScope,
  tenantSlug: string,
  clientIp: string,
  subject?: string
): string {
  return `fdm:pin-fail:${scope}:${tenantSlug}:${rateLimitIdentity(clientIp, subject)}`;
}

function blockKey(
  scope: PinRateLimitScope,
  tenantSlug: string,
  clientIp: string,
  subject?: string
): string {
  return `fdm:pin-block:${scope}:${tenantSlug}:${rateLimitIdentity(clientIp, subject)}`;
}

type MemoryEntry = {
  failures: number;
  windowExpiresAt: number;
  blockedUntil: number;
};

const memoryStore = new Map<string, MemoryEntry>();

function readMemoryBlock(key: string): boolean {
  const entry = memoryStore.get(key);
  if (!entry) return false;
  if (entry.blockedUntil > Date.now()) return true;
  if (entry.blockedUntil > 0 && entry.blockedUntil <= Date.now()) {
    entry.blockedUntil = 0;
  }
  return false;
}

function recordMemoryFailure(
  failStoreKey: string,
  blockStoreKey: string,
  maxFailures: number,
  windowSec: number,
  blockSec: number
): void {
  const now = Date.now();
  let entry = memoryStore.get(failStoreKey);
  if (!entry || entry.windowExpiresAt <= now) {
    entry = { failures: 0, windowExpiresAt: now + windowSec * 1000, blockedUntil: 0 };
  }

  entry.failures += 1;
  memoryStore.set(failStoreKey, entry);

  if (entry.failures >= maxFailures) {
    entry.blockedUntil = now + blockSec * 1000;
    memoryStore.set(blockStoreKey, entry);
  }
}

function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

async function upstashRequest<T>(path: string): Promise<T | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!baseUrl || !token) return null;

  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    console.error('pinRateLimit upstash:', response.status, await response.text().catch(() => ''));
    return null;
  }

  const payload = (await response.json()) as { result?: T };
  return payload.result ?? null;
}

async function isBlockedUpstash(key: string): Promise<boolean | null> {
  const value = await upstashRequest<string | null>(`/get/${encodeURIComponent(key)}`);
  if (value === null) return false;
  return Boolean(value);
}

async function recordFailureUpstash(
  failStoreKey: string,
  blockStoreKey: string,
  maxFailures: number,
  windowSec: number,
  blockSec: number
): Promise<void> {
  const count = await upstashRequest<number>(`/incr/${encodeURIComponent(failStoreKey)}`);
  if (count === null) return;

  if (count === 1) {
    await upstashRequest<number>(
      `/expire/${encodeURIComponent(failStoreKey)}/${windowSec}`
    );
  }

  if (count >= maxFailures) {
    await upstashRequest<string>(
      `/set/${encodeURIComponent(blockStoreKey)}/1/ex/${blockSec}`
    );
  }
}

export async function isPinAttemptRateLimited(input: {
  scope: PinRateLimitScope;
  tenantSlug: string;
  clientIp: string;
  /** Staff login: rate limit per tenant + login instead of client IP. */
  rateLimitSubject?: string;
}): Promise<boolean> {
  const blockStoreKey = blockKey(
    input.scope,
    input.tenantSlug,
    input.clientIp,
    input.rateLimitSubject
  );

  if (isUpstashConfigured()) {
    const blocked = await isBlockedUpstash(blockStoreKey);
    return blocked === true;
  }

  return readMemoryBlock(blockStoreKey);
}

export async function recordPinAttemptFailure(input: {
  scope: PinRateLimitScope;
  tenantSlug: string;
  clientIp: string;
  rateLimitSubject?: string;
}): Promise<void> {
  const failStoreKey = failKey(
    input.scope,
    input.tenantSlug,
    input.clientIp,
    input.rateLimitSubject
  );
  const blockStoreKey = blockKey(
    input.scope,
    input.tenantSlug,
    input.clientIp,
    input.rateLimitSubject
  );

  if (isUpstashConfigured()) {
    await recordFailureUpstash(
      failStoreKey,
      blockStoreKey,
      PIN_RATE_LIMIT_MAX_FAILURES,
      PIN_RATE_LIMIT_WINDOW_SEC,
      PIN_RATE_LIMIT_BLOCK_SEC
    );
    return;
  }

  recordMemoryFailure(
    failStoreKey,
    blockStoreKey,
    PIN_RATE_LIMIT_MAX_FAILURES,
    PIN_RATE_LIMIT_WINDOW_SEC,
    PIN_RATE_LIMIT_BLOCK_SEC
  );
}

export function resetPinRateLimitMemoryForTests(): void {
  memoryStore.clear();
}
