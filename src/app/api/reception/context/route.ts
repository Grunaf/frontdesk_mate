import { NextResponse, type NextRequest } from 'next/server';
import {
  readReceptionSessionFromRequest,
  type ReceptionSessionPayload,
} from '@/app/reception/lib/receptionSession';
import { resolveReceptionTenantSlug } from '@/app/reception/lib/resolveReceptionTenantSlug';
import { listReceptionUsersByTenant } from '@/entities/reception-user/server';
import { FALLBACK_RECEPTION_ACTOR_LABEL } from '@/features/reception-sync/model/types';
import { buildReceptionOperationalContext } from '@/features/reception-sync/server';

export async function getReceptionActorLabel(
  tenantSlug: string,
  session: ReceptionSessionPayload
): Promise<string> {
  const users = await listReceptionUsersByTenant(tenantSlug);
  const match = users.find((user) => user.id === session.receptionUserId);
  if (!match || match.disabled_at) {
    return FALLBACK_RECEPTION_ACTOR_LABEL;
  }

  const displayName = match.display_name.trim();
  return displayName || match.login || FALLBACK_RECEPTION_ACTOR_LABEL;
}

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

  const session = readReceptionSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const context = await buildReceptionOperationalContext(tenantSlug);
  const actorDisplayName = await getReceptionActorLabel(tenantSlug, session);

  return NextResponse.json({ ...context, actorDisplayName }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
