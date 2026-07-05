import { createOwnerServerClient, isOwnerSupabaseConfigured } from '@/shared/lib/db/supabase-owner-server';
import type { OwnerSessionUser } from '../model/types';

export async function getOwnerSession(): Promise<OwnerSessionUser | null> {
  if (!isOwnerSupabaseConfigured()) {
    return null;
  }

  const supabase = await createOwnerServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}
