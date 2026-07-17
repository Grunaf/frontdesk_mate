import { NextResponse } from 'next/server';
import { createOwnerServerClient } from '@/shared/lib/db/supabase-owner-server';
import { ownerPortalOriginUrl } from '../../../lib/resolveOwnerPortalOrigin';

export async function POST(
  request: Request,
  context: { params: Promise<{ locale: string }> }
) {
  const { locale } = await context.params;
  const supabase = await createOwnerServerClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(ownerPortalOriginUrl(request, `/${locale}/login`), 303);
}
