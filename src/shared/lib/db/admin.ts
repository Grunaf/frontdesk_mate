import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client (secret / service_role key).
 * Import only from Server Actions, Route Handlers, or server components.
 */
function resolveSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey = resolveSecretKey();

  if (!url || !secretKey) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && resolveSecretKey());
}
