'use server';

import { revalidatePath } from 'next/cache';

import { assertAdminAuthenticated } from '@/app/admin/lib/adminSession';
import {
  assertOwnerAuthenticated,
  getOwnerTenantContext,
} from '@/entities/hostel-owner';
import { resolveOwnerEditAccess } from '@/entities/hostel-owner/lib/resolveOwnerEditAccess';
import type { ReceptionUserRecord } from '@/entities/reception-user/server';
import {
  createReceptionUser,
  disableReceptionUser,
  listReceptionUsersByTenant,
  setReceptionUserPinHash,
} from '@/entities/reception-user/server';
import { getTenantRecord } from '@/entities/tenant/server';
import { insertTenantAuditEvent } from '@/entities/tenant-audit';
import type { TenantAuditEventType } from '@/entities/tenant-audit';

import {
  isActiveReceptionStaffLimitReached,
  MAX_ACTIVE_RECEPTION_STAFF,
  validateReceptionStaffCreateDraft,
  validateReceptionStaffPinDraft,
} from '../lib/validateReceptionStaffForm';
import type {
  ReceptionStaffListResult,
  ReceptionStaffMutateResult,
  ReceptionStaffSurface,
  ReceptionStaffUser,
} from '../model/types';

function toPublicUser(row: ReceptionUserRecord): ReceptionStaffUser {
  return {
    id: row.id,
    login: row.login,
    displayName: row.display_name,
    disabledAt: row.disabled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type ActorResolveResult =
  | { ok: true; slug: string; locale?: string }
  | { ok: false; error: 'unauthorized' | 'forbidden' };

async function resolveReceptionStaffActor(
  tenantSlug: string,
  surface: ReceptionStaffSurface,
  localeRaw?: string
): Promise<ActorResolveResult> {
  const slug = tenantSlug.trim();
  if (!slug) {
    return { ok: false, error: 'forbidden' };
  }

  if (surface === 'platform') {
    await assertAdminAuthenticated();
    return { ok: true, slug };
  }

  await assertOwnerAuthenticated();
  const context = await getOwnerTenantContext();
  if (!context) {
    return { ok: false, error: 'unauthorized' };
  }

  const access = resolveOwnerEditAccess(context.lifecycleStatus);
  if (!access.canEditSettings) {
    return { ok: false, error: 'forbidden' };
  }

  if (context.slug !== slug) {
    return { ok: false, error: 'forbidden' };
  }

  const locale = (localeRaw ?? 'en').trim() || 'en';
  return { ok: true, slug, locale };
}

function parseSurface(value: string): ReceptionStaffSurface | null {
  if (value === 'platform' || value === 'owner') {
    return value;
  }
  return null;
}

function revalidateReceptionStaffPaths(slug: string, surface: ReceptionStaffSurface, locale?: string) {
  if (surface === 'platform') {
    revalidatePath('/admin/tenants');
    revalidatePath(`/admin/tenants/${slug}`);
    revalidatePath(`/admin/tenants/${slug}/settings/contacts`);
    return;
  }

  const loc = locale ?? 'en';
  revalidatePath(`/${loc}/settings`, 'layout');
  revalidatePath(`/${loc}/settings/contacts`);
}

async function recordReceptionStaffAuditEvent(input: {
  tenantSlug: string;
  surface: ReceptionStaffSurface;
  eventType: Extract<
    TenantAuditEventType,
    | 'reception_staff_user_created'
    | 'reception_staff_user_disabled'
    | 'reception_staff_pin_changed'
  >;
  receptionUserId: string;
}): Promise<void> {
  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return;
  }

  if (input.surface === 'platform') {
    await insertTenantAuditEvent({
      tenantId: tenant.id,
      actorKind: 'platform',
      actorUserId: null,
      eventType: input.eventType,
      changedKeys: [],
      flags: { receptionUserId: input.receptionUserId },
    });
    return;
  }

  const owner = await assertOwnerAuthenticated();
  await insertTenantAuditEvent({
    tenantId: tenant.id,
    actorKind: 'owner',
    actorUserId: owner.id,
    eventType: input.eventType,
    changedKeys: [],
    flags: { receptionUserId: input.receptionUserId },
  });
}

export async function listReceptionStaffUsersAction(
  tenantSlug: string,
  surface: ReceptionStaffSurface
): Promise<ReceptionStaffListResult> {
  const actor = await resolveReceptionStaffActor(tenantSlug, surface);
  if (!actor.ok) {
    return { ok: false, error: actor.error };
  }

  const rows = await listReceptionUsersByTenant(actor.slug);
  return { ok: true, users: rows.map(toPublicUser) };
}

export async function createReceptionUserAction(formData: FormData): Promise<ReceptionStaffMutateResult> {
  const surface = parseSurface(String(formData.get('surface') ?? ''));
  const tenantSlug = String(formData.get('tenantSlug') ?? '').trim();
  const locale = String(formData.get('locale') ?? 'en').trim();

  if (!surface) {
    return { ok: false, error: 'validation' };
  }

  const actor = await resolveReceptionStaffActor(tenantSlug, surface, locale);
  if (!actor.ok) {
    return { ok: false, error: actor.error };
  }

  const login = String(formData.get('login') ?? '');
  const displayName = String(formData.get('displayName') ?? '');
  const pin = String(formData.get('pin') ?? '');

  const validation = validateReceptionStaffCreateDraft({ login, displayName, pin });
  if (!validation.ok) {
    return { ok: false, error: 'validation' };
  }

  const existing = await listReceptionUsersByTenant(actor.slug);
  if (isActiveReceptionStaffLimitReached(existing.map(toPublicUser))) {
    return { ok: false, error: 'active_limit' };
  }

  const result = await createReceptionUser({
    tenantSlug: actor.slug,
    login: login.trim(),
    displayName: displayName.trim(),
    pin: pin.trim(),
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await recordReceptionStaffAuditEvent({
    tenantSlug: actor.slug,
    surface,
    eventType: 'reception_staff_user_created',
    receptionUserId: result.user.id,
  });

  revalidateReceptionStaffPaths(actor.slug, surface, actor.locale);
  return { ok: true, user: toPublicUser(result.user) };
}

export async function updateReceptionUserPinAction(
  formData: FormData
): Promise<ReceptionStaffMutateResult> {
  const surface = parseSurface(String(formData.get('surface') ?? ''));
  const tenantSlug = String(formData.get('tenantSlug') ?? '').trim();
  const locale = String(formData.get('locale') ?? 'en').trim();
  const userId = String(formData.get('userId') ?? '').trim();

  if (!surface || !userId) {
    return { ok: false, error: 'validation' };
  }

  const actor = await resolveReceptionStaffActor(tenantSlug, surface, locale);
  if (!actor.ok) {
    return { ok: false, error: actor.error };
  }

  const pin = String(formData.get('pin') ?? '');
  const validation = validateReceptionStaffPinDraft(pin);
  if (!validation.ok) {
    return { ok: false, error: 'validation' };
  }

  const result = await setReceptionUserPinHash({
    tenantSlug: actor.slug,
    userId,
    pin: pin.trim(),
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await recordReceptionStaffAuditEvent({
    tenantSlug: actor.slug,
    surface,
    eventType: 'reception_staff_pin_changed',
    receptionUserId: result.user.id,
  });

  revalidateReceptionStaffPaths(actor.slug, surface, actor.locale);
  return { ok: true, user: toPublicUser(result.user) };
}

export async function disableReceptionUserAction(formData: FormData): Promise<ReceptionStaffMutateResult> {
  const surface = parseSurface(String(formData.get('surface') ?? ''));
  const tenantSlug = String(formData.get('tenantSlug') ?? '').trim();
  const locale = String(formData.get('locale') ?? 'en').trim();
  const userId = String(formData.get('userId') ?? '').trim();

  if (!surface || !userId) {
    return { ok: false, error: 'validation' };
  }

  const actor = await resolveReceptionStaffActor(tenantSlug, surface, locale);
  if (!actor.ok) {
    return { ok: false, error: actor.error };
  }

  const result = await disableReceptionUser({
    tenantSlug: actor.slug,
    userId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await recordReceptionStaffAuditEvent({
    tenantSlug: actor.slug,
    surface,
    eventType: 'reception_staff_user_disabled',
    receptionUserId: result.user.id,
  });

  revalidateReceptionStaffPaths(actor.slug, surface, actor.locale);
  return { ok: true, user: toPublicUser(result.user) };
}

export { MAX_ACTIVE_RECEPTION_STAFF };
