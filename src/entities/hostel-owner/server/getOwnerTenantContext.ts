import { createOwnerServerClient, isOwnerSupabaseConfigured } from '@/shared/lib/db/supabase-owner-server';
import type { OwnerTenantContext } from '../model/types';
import { getOwnerSession } from './getOwnerSession';

export async function getOwnerTenantContext(): Promise<OwnerTenantContext | null> {
  const session = await getOwnerSession();
  if (!session || !isOwnerSupabaseConfigured()) {
    return null;
  }

  const supabase = await createOwnerServerClient();

  const { data: ownerRow, error: ownerError } = await supabase
    .from('tenant_owners')
    .select('tenant_id')
    .maybeSingle();

  if (ownerError || !ownerRow?.tenant_id) {
    return null;
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, slug, name')
    .eq('id', ownerRow.tenant_id)
    .maybeSingle();

  if (tenantError || !tenant) {
    return null;
  }

  return {
    userId: session.id,
    email: session.email ?? '',
    tenantId: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
  };
}
