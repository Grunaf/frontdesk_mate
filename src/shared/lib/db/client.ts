import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const globalForDb = globalThis as unknown as {
  supabase?: ReturnType<typeof createClient>;
};

export const supabase =
  globalForDb.supabase ??
  createClient(supabaseUrl, supabasePublishableKey);

if (process.env.NODE_ENV !== 'production') {
  globalForDb.supabase = supabase;
}
