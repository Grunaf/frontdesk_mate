import { isCityPackId, type CityPackId } from '@/entities/hostel';
import { listCityPacksForTenantSelect } from '@/entities/city-pack/api/cityPackRepository';
import {
  parseAdminDateInput,
  toDateInputValue,
} from '@/entities/tenant/lib/resolveTenantLifecycle';
import {
  tenantSlugValidationMessage,
  validateTenantSlugInput,
} from '@/entities/tenant/lib/validateTenantSlug';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { insertTenantAuditEvent } from '@/entities/tenant-audit';
import { revalidatePath } from 'next/cache';
import { getOwnerSession } from './getOwnerSession';

export type CreateOwnerTenantFailureCode =
  | 'unauthorized'
  | 'already_has_hostel'
  | 'invalid_name'
  | 'invalid_slug'
  | 'slug_taken'
  | 'invalid_city_pack'
  | 'server_misconfigured'
  | 'create_failed';

export type CreateOwnerTenantResult =
  | { ok: true; slug: string }
  | { ok: false; code: CreateOwnerTenantFailureCode; message: string };

const DISPLAY_NAME_MAX = 120;

function buildOwnerSubscriptionTimestamps(): { startsAt: string; endsAt: string } | null {
  const starts = new Date();
  const ends = new Date(starts);
  ends.setFullYear(ends.getFullYear() + 1);

  const startsAt = parseAdminDateInput(toDateInputValue(starts.toISOString()), 'start');
  const endsAt = parseAdminDateInput(toDateInputValue(ends.toISOString()), 'end');

  if (!startsAt || !endsAt) {
    return null;
  }

  return { startsAt, endsAt };
}

async function isCityPackReadyForOwnerOnboarding(cityPackId: CityPackId): Promise<boolean> {
  const { options, error } = await listCityPacksForTenantSelect();
  if (error) {
    return false;
  }

  return options.some((pack) => pack.id === cityPackId && pack.readyForTenants && !pack.notReadyReason);
}

export async function createOwnerTenant(input: {
  name: string;
  slugRaw: string;
  cityPackId: string;
  locale?: string;
}): Promise<CreateOwnerTenantResult> {
  const session = await getOwnerSession();
  if (!session) {
    return { ok: false, code: 'unauthorized', message: 'Sign in to continue.' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: 'server_misconfigured',
      message: 'Hostel creation is temporarily unavailable. Try again later.',
    };
  }

  const { data: existingOwner, error: ownerLookupError } = await admin
    .from('tenant_owners')
    .select('id')
    .eq('user_id', session.id)
    .maybeSingle();

  if (ownerLookupError) {
    return { ok: false, code: 'create_failed', message: ownerLookupError.message };
  }

  if (existingOwner) {
    return {
      ok: false,
      code: 'already_has_hostel',
      message: 'You already manage a hostel.',
    };
  }

  const name = input.name.trim();
  if (!name || name.length > DISPLAY_NAME_MAX) {
    return {
      ok: false,
      code: 'invalid_name',
      message: name ? 'Display name is too long.' : 'Display name is required.',
    };
  }

  const slugValidation = validateTenantSlugInput(input.slugRaw);
  if (!slugValidation.ok) {
    return {
      ok: false,
      code: 'invalid_slug',
      message: tenantSlugValidationMessage(slugValidation.code),
    };
  }

  const slug = slugValidation.slug;

  if (!isCityPackId(input.cityPackId)) {
    return {
      ok: false,
      code: 'invalid_city_pack',
      message: 'Choose a valid city pack.',
    };
  }

  const cityPackId = input.cityPackId;
  const packReady = await isCityPackReadyForOwnerOnboarding(cityPackId);
  if (!packReady) {
    return {
      ok: false,
      code: 'invalid_city_pack',
      message: 'This city pack is not available for new hostels.',
    };
  }

  const { data: slugOwner, error: slugOwnerError } = await admin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (slugOwnerError) {
    return { ok: false, code: 'create_failed', message: slugOwnerError.message };
  }

  if (slugOwner) {
    return {
      ok: false,
      code: 'slug_taken',
      message: `Slug "${slug}" is already taken. Choose another.`,
    };
  }

  const subscription = buildOwnerSubscriptionTimestamps();
  if (!subscription) {
    return { ok: false, code: 'create_failed', message: 'Could not set subscription dates.' };
  }

  const { data: insertedTenant, error: insertTenantError } = await admin
    .from('tenants')
    .insert({
      slug,
      name,
      city_pack_id: cityPackId,
      settings: {},
      subscription_starts_at: subscription.startsAt,
      subscription_ends_at: subscription.endsAt,
      archived_at: null,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertTenantError || !insertedTenant?.id) {
    const isUniqueViolation =
      insertTenantError?.code === '23505' ||
      insertTenantError?.message?.toLowerCase().includes('duplicate');
    if (isUniqueViolation) {
      return {
        ok: false,
        code: 'slug_taken',
        message: `Slug "${slug}" is already taken. Choose another.`,
      };
    }
    return {
      ok: false,
      code: 'create_failed',
      message: insertTenantError?.message ?? 'Could not create hostel.',
    };
  }

  const tenantId = insertedTenant.id;

  const { error: linkError } = await admin.from('tenant_owners').insert({
    user_id: session.id,
    tenant_id: tenantId,
  });

  if (linkError) {
    // Compensating delete: avoid orphan tenant without owner binding (no multi-statement TX in JS client).
    const { error: rollbackError } = await admin.from('tenants').delete().eq('id', tenantId);
    if (rollbackError) {
      console.error('[createOwnerTenant] rollback failed after tenant_owners insert error', {
        tenantId,
        linkError: linkError.message,
        rollbackError: rollbackError.message,
      });
    }

    const alreadyLinked =
      linkError.code === '23505' || linkError.message.toLowerCase().includes('unique');
    if (alreadyLinked) {
      return {
        ok: false,
        code: 'already_has_hostel',
        message: 'You already manage a hostel.',
      };
    }

    return { ok: false, code: 'create_failed', message: linkError.message };
  }

  const locale = input.locale?.trim() || 'en';
  revalidatePath(`/${locale}/onboarding`);
  revalidatePath(`/${locale}/setup`);
  revalidatePath(`/${locale}`);

  await insertTenantAuditEvent({
    tenantId,
    actorKind: 'owner',
    actorUserId: session.id,
    eventType: 'tenant_created',
    changedKeys: [],
    flags: { cityPackId },
  });

  return { ok: true, slug };
}
