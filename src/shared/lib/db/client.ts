import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY!;
const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof createClient>;
};

export const supabase = createClient(supabaseUrl, supabaseSecretKey);
