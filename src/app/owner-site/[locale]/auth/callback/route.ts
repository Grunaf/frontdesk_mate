import { NextResponse } from 'next/server';
import { createOwnerServerClient } from '@/shared/lib/db/supabase-owner-server';

export async function GET(
  request: Request,
  context: { params: Promise<{ locale: string }> }
) {
  const { locale } = await context.params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextPath = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createOwnerServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(`/${locale}${nextPath}`, origin));
    }
  }

  return NextResponse.redirect(new URL(`/${locale}/login?error=auth_callback`, origin));
}
