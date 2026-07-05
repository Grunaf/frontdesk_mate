'use server';

import { redirect } from 'next/navigation';
import { createOwnerServerClient } from '@/shared/lib/db/supabase-owner-server';

export async function ownerSignOutAction(locale: string): Promise<void> {
  const supabase = await createOwnerServerClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
