import { NextResponse, type NextRequest } from 'next/server';
import { readReceptionSessionFromRequest } from '@/app/reception/lib/receptionSession';
import { resolveReceptionTenantSlug } from '@/app/reception/lib/resolveReceptionTenantSlug';
import { buildReceptionOperationalContext } from '@/features/reception-sync/server';

function resolveAuthorizedTenantSlug(request: NextRequest): string | null {
  const session = readReceptionSessionFromRequest(request);
  if (!session) return null;

  const hostSlug = resolveReceptionTenantSlug(request);
  if (hostSlug && hostSlug !== session.tenantSlug) {
    return null;
  }

  if (!hostSlug && process.env.NODE_ENV === 'production') {
    return null;
  }

  return session.tenantSlug;
}

export async function GET(request: NextRequest) {
  const tenantSlug = resolveAuthorizedTenantSlug(request);
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const context = await buildReceptionOperationalContext(tenantSlug);

  return NextResponse.json(context, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
