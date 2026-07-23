import type { ReceptionOperationalContext } from '../model/types';

export type FetchReceptionOperationalContextResult =
  | { ok: true; context: ReceptionOperationalContext }
  | { ok: false; error: 'unauthorized' | 'invalid_response' | 'network' };

function isReceptionOperationalContext(value: unknown): value is ReceptionOperationalContext {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  const operational = record.operational;

  return (
    typeof record.generatedAt === 'string' &&
    typeof record.operationalDayStartTime === 'string' &&
    (record.actorDisplayName === undefined ||
      (typeof record.actorDisplayName === 'string' && record.actorDisplayName.length > 0)) &&
    operational !== null &&
    typeof operational === 'object' &&
    typeof (operational as Record<string, unknown>).operationalDate === 'string' &&
    typeof (operational as Record<string, unknown>).startsAt === 'string' &&
    typeof (operational as Record<string, unknown>).endsAt === 'string' &&
    Array.isArray(record.stays) &&
    (record.planStays === undefined || Array.isArray(record.planStays)) &&
    Array.isArray(record.openIssues) &&
    Array.isArray(record.openTransfers) &&
    (record.staffPermissions === undefined || Array.isArray(record.staffPermissions))
  );
}

export async function fetchReceptionOperationalContext(): Promise<FetchReceptionOperationalContextResult> {
  try {
    const response = await fetch('/api/reception/context', {
      credentials: 'include',
      cache: 'no-store',
    });

    if (response.status === 401) {
      return { ok: false, error: 'unauthorized' };
    }

    if (!response.ok) {
      return { ok: false, error: 'invalid_response' };
    }

    const payload: unknown = await response.json();

    if (
      payload &&
      typeof payload === 'object' &&
      'ok' in payload &&
      (payload as { ok?: boolean }).ok === false &&
      'error' in payload &&
      (payload as { error?: string }).error === 'unauthorized'
    ) {
      return { ok: false, error: 'unauthorized' };
    }

    if (!isReceptionOperationalContext(payload)) {
      return { ok: false, error: 'invalid_response' };
    }

    return { ok: true, context: payload };
  } catch {
    return { ok: false, error: 'network' };
  }
}
