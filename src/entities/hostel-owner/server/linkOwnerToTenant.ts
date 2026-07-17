import 'server-only';

import { insertTenantAuditEvent } from '@/entities/tenant-audit';
import { getOwnerPortalUrl } from '@/shared/config/site';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

export type LinkOwnerToTenantFailureCode =
  | 'invalid_email'
  | 'tenant_not_found'
  | 'tenant_already_has_owner'
  | 'user_already_owns_tenant'
  | 'server_misconfigured'
  | 'link_failed';

export type LinkOwnerToTenantResult =
  | { ok: true; email: string; userId: string; invited: boolean }
  | { ok: false; code: LinkOwnerToTenantFailureCode; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return null;
  }
  return email;
}

function isUniqueViolation(error: { code?: string; message: string }): boolean {
  return error.code === '23505' || error.message.toLowerCase().includes('unique');
}

function isAlreadyRegisteredAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('already been registered') ||
    lower.includes('already registered') ||
    lower.includes('user already exists') ||
    lower.includes('email address already')
  );
}

async function findAuthUserIdByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<{ userId: string | null; errorMessage: string | null }> {
  let page = 1;
  const perPage = 200;
  const maxPages = 50;

  while (page <= maxPages) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return { userId: null, errorMessage: error.message };
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match?.id) {
      return { userId: match.id, errorMessage: null };
    }

    if (data.users.length < perPage) {
      return { userId: null, errorMessage: null };
    }

    page += 1;
  }

  return { userId: null, errorMessage: null };
}

async function resolveOrInviteOwnerUser(
  admin: SupabaseClient,
  email: string,
): Promise<{ userId: string; invited: boolean } | { errorMessage: string }> {
  const existing = await findAuthUserIdByEmail(admin, email);
  if (existing.errorMessage) {
    return { errorMessage: existing.errorMessage };
  }

  if (existing.userId) {
    return { userId: existing.userId, invited: false };
  }

  const redirectTo = getOwnerPortalUrl('/en/auth/callback');
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });

  if (!error && data.user?.id) {
    return { userId: data.user.id, invited: true };
  }

  if (error && isAlreadyRegisteredAuthError(error.message)) {
    const retry = await findAuthUserIdByEmail(admin, email);
    if (retry.userId) {
      return { userId: retry.userId, invited: false };
    }
    return { errorMessage: retry.errorMessage ?? error.message };
  }

  return { errorMessage: error?.message ?? 'Could not invite owner.' };
}

/**
 * Platform ops: bind an existing tenant to an owner auth user (1:1).
 * Creates/invites the auth user when the email is new.
 */
export async function linkOwnerToTenant(input: {
  tenantId: string;
  email: string;
}): Promise<LinkOwnerToTenantResult> {
  const email = normalizeEmail(input.email);
  if (!email) {
    return { ok: false, code: 'invalid_email', message: 'Enter a valid owner email.' };
  }

  const tenantId = input.tenantId.trim();
  if (!tenantId) {
    return { ok: false, code: 'tenant_not_found', message: 'Tenant not found.' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: 'server_misconfigured',
      message: 'Owner linking is temporarily unavailable.',
    };
  }

  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .select('id, slug')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenantError) {
    return { ok: false, code: 'link_failed', message: tenantError.message };
  }

  if (!tenant?.id) {
    return { ok: false, code: 'tenant_not_found', message: 'Tenant not found.' };
  }

  const { data: existingTenantOwner, error: tenantOwnerError } = await admin
    .from('tenant_owners')
    .select('id')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (tenantOwnerError) {
    return { ok: false, code: 'link_failed', message: tenantOwnerError.message };
  }

  if (existingTenantOwner) {
    return {
      ok: false,
      code: 'tenant_already_has_owner',
      message: 'This hostel already has a linked owner.',
    };
  }

  const resolved = await resolveOrInviteOwnerUser(admin, email);
  if ('errorMessage' in resolved) {
    return { ok: false, code: 'link_failed', message: resolved.errorMessage };
  }

  const { data: existingUserOwner, error: userOwnerError } = await admin
    .from('tenant_owners')
    .select('id, tenant_id')
    .eq('user_id', resolved.userId)
    .maybeSingle();

  if (userOwnerError) {
    return { ok: false, code: 'link_failed', message: userOwnerError.message };
  }

  if (existingUserOwner) {
    return {
      ok: false,
      code: 'user_already_owns_tenant',
      message: 'This email already manages another hostel.',
    };
  }

  const { error: linkError } = await admin.from('tenant_owners').insert({
    user_id: resolved.userId,
    tenant_id: tenantId,
  });

  if (linkError) {
    if (isUniqueViolation(linkError)) {
      const { data: byTenant } = await admin
        .from('tenant_owners')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (byTenant) {
        return {
          ok: false,
          code: 'tenant_already_has_owner',
          message: 'This hostel already has a linked owner.',
        };
      }

      return {
        ok: false,
        code: 'user_already_owns_tenant',
        message: 'This email already manages another hostel.',
      };
    }

    return { ok: false, code: 'link_failed', message: linkError.message };
  }

  await insertTenantAuditEvent({
    tenantId,
    actorKind: 'platform',
    actorUserId: null,
    eventType: 'owner_linked',
    changedKeys: [],
    flags: { ownerEmail: email },
  });

  revalidatePath(`/admin/tenants/${tenant.slug}/owner`);
  revalidatePath(`/admin/tenants/${tenant.slug}/settings`);

  return {
    ok: true,
    email,
    userId: resolved.userId,
    invited: resolved.invited,
  };
}
