import 'server-only';

import webpush from 'web-push';
import { getTenantRecord } from '@/entities/tenant/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import type {
  ReceptionPushPayload,
  ReceptionPushSubscriptionRecord,
  WebPushSubscriptionJson,
} from '../model/types';

function isWebPushSubscriptionJson(value: unknown): value is WebPushSubscriptionJson {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const keys = record.keys;
  if (!keys || typeof keys !== 'object') return false;
  const keyRecord = keys as Record<string, unknown>;
  return (
    typeof record.endpoint === 'string' &&
    record.endpoint.length > 0 &&
    typeof keyRecord.p256dh === 'string' &&
    typeof keyRecord.auth === 'string'
  );
}

function mapRow(row: Record<string, unknown>): ReceptionPushSubscriptionRecord {
  const subscription = row.subscription;
  if (!isWebPushSubscriptionJson(subscription)) {
    throw new Error('Invalid reception push subscription row');
  }

  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    endpoint: String(row.endpoint),
    subscription,
    user_agent: row.user_agent ? String(row.user_agent) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function upsertReceptionPushSubscription(input: {
  tenantSlug: string;
  subscription: WebPushSubscriptionJson;
  userAgent?: string | null;
}): Promise<{ ok: true } | { ok: false; error: 'tenant_not_found' | 'db_unavailable' | 'invalid_subscription' }> {
  if (!isWebPushSubscriptionJson(input.subscription)) {
    return { ok: false, error: 'invalid_subscription' };
  }

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const now = new Date().toISOString();
  const { error } = await admin.from('reception_push_subscriptions').upsert(
    {
      tenant_id: tenant.id,
      endpoint: input.subscription.endpoint,
      subscription: input.subscription,
      user_agent: input.userAgent?.trim() || null,
      updated_at: now,
    },
    { onConflict: 'tenant_id,endpoint' }
  );

  if (error) {
    console.error('upsertReceptionPushSubscription:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true };
}

export async function listReceptionPushSubscriptions(
  tenantSlug: string
): Promise<ReceptionPushSubscriptionRecord[]> {
  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) return [];

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from('reception_push_subscriptions')
    .select('id, tenant_id, endpoint, subscription, user_agent, created_at, updated_at')
    .eq('tenant_id', tenant.id);

  if (error || !data) {
    console.error('listReceptionPushSubscriptions:', error?.message ?? 'no data');
    return [];
  }

  return data.map((row) => mapRow(row as Record<string, unknown>));
}

async function deleteReceptionPushSubscriptionByEndpoint(
  tenantId: string,
  endpoint: string
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const { error } = await admin
    .from('reception_push_subscriptions')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('endpoint', endpoint);

  if (error) {
    console.error('deleteReceptionPushSubscriptionByEndpoint:', error.message);
  }
}

function readVapidConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'mailto:hello@frontdeskmate.com';

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  const config = readVapidConfig();
  if (!config) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    vapidConfigured = true;
  }
  return true;
}

export function isReceptionWebPushConfigured(): boolean {
  return Boolean(readVapidConfig());
}

export async function sendReceptionPushToTenant(
  tenantSlug: string,
  payload: ReceptionPushPayload
): Promise<{ sent: number; failed: number }> {
  if (!ensureVapidConfigured()) {
    return { sent: 0, failed: 0 };
  }

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await listReceptionPushSubscriptions(tenantSlug);
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, body);
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode =
          error && typeof error === 'object' && 'statusCode' in error
            ? Number((error as { statusCode: number }).statusCode)
            : null;
        if (statusCode === 404 || statusCode === 410) {
          await deleteReceptionPushSubscriptionByEndpoint(tenant.id, row.endpoint);
        }
        console.error('sendReceptionPushToTenant:', row.endpoint, error);
      }
    })
  );

  return { sent, failed };
}

export async function notifyReceptionDesk(input: {
  tenantSlug: string;
  payload: ReceptionPushPayload;
}): Promise<void> {
  try {
    await sendReceptionPushToTenant(input.tenantSlug, input.payload);
  } catch (error) {
    console.error('notifyReceptionDesk:', error);
  }
}
