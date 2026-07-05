import { NextResponse } from 'next/server';
import { createOwnerServerClient } from '@/shared/lib/db/supabase-owner-server';

export async function POST(
  request: Request,
  context: { params: Promise<{ locale: string }> }
) {
  const { locale } = await context.params;
  const supabase = await createOwnerServerClient();
  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(new URL(`/${locale}/login`, origin), 303);
}
