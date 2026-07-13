import { NextResponse, type NextRequest } from 'next/server';
import { readReceptionSessionFromRequest } from '@/app/reception/lib/receptionSession';
import { resolveReceptionTenantSlug } from '@/app/reception/lib/resolveReceptionTenantSlug';
import { upsertReceptionPushSubscription } from '@/entities/reception-push/server';
import type { WebPushSubscriptionJson } from '@/entities/reception-push';

function resolveAuthorizedTenantSlug(request: NextRequest): string | null {
  const session = readReceptionSessionFromRequest(request);
  if (!session) return null;

  const hostSlug = resolveReceptionTenantSlug(request);
  if (hostSlug && hostSlug !== session.tenantSlug) {
    return null;
  }

  if (!hostSlug && process.env.NODE_ENV === 'production') {
    return null;
  }

  return session.tenantSlug;
}

function parseSubscriptionBody(body: unknown): WebPushSubscriptionJson | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const keys = record.keys;
  if (!keys || typeof keys !== 'object') return null;
  const keyRecord = keys as Record<string, unknown>;
  if (
    typeof record.endpoint !== 'string' ||
    typeof keyRecord.p256dh !== 'string' ||
    typeof keyRecord.auth !== 'string'
  ) {
    return null;
  }

  const expirationTime =
    record.expirationTime === null || record.expirationTime === undefined
      ? null
      : Number(record.expirationTime);

  return {
    endpoint: record.endpoint,
    expirationTime: Number.isFinite(expirationTime) ? expirationTime : null,
    keys: {
      p256dh: keyRecord.p256dh,
      auth: keyRecord.auth,
    },
  };
}

export async function POST(request: NextRequest) {
  const tenantSlug = resolveAuthorizedTenantSlug(request);
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const subscription = parseSubscriptionBody(body);
  if (!subscription) {
    return NextResponse.json({ ok: false, error: 'invalid_subscription' }, { status: 400 });
  }

  const result = await upsertReceptionPushSubscription({
    tenantSlug,
    subscription,
    userAgent: request.headers.get('user-agent'),
  });

  if (!result.ok) {
    const status = result.error === 'tenant_not_found' ? 404 : 503;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
