import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';

export type TenantOwnerForAdmin = {
  userId: string;
  email: string | null;
  linkedAt: string;
};

export async function getTenantOwnerForAdmin(tenantId: string): Promise<TenantOwnerForAdmin | null> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return null;
  }

  const { data: ownerRow, error } = await admin
    .from('tenant_owners')
    .select('user_id, created_at')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error || !ownerRow?.user_id) {
    return null;
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(ownerRow.user_id);
  if (userError) {
    return {
      userId: ownerRow.user_id,
      email: null,
      linkedAt: ownerRow.created_at,
    };
  }

  return {
    userId: ownerRow.user_id,
    email: userData.user?.email ?? null,
    linkedAt: ownerRow.created_at,
  };
}

export async function listTenantIdsWithOwnerForAdmin(): Promise<Set<string>> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return new Set();
  }

  const { data, error } = await admin.from('tenant_owners').select('tenant_id');

  if (error || !data) {
    return new Set();
  }

  return new Set(data.map((row) => row.tenant_id as string).filter(Boolean));
}
