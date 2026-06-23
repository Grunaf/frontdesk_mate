import type { GuestStayRecord } from '../model/types';
import { formatStayReference } from './formatStayReference';

export function normalizeStayReferenceQuery(query: string): string {
  return query.replace(/#/g, '').replace(/\s+/g, '').trim().toUpperCase();
}

export function findStayByReference<T extends Pick<GuestStayRecord, 'id'>>(
  stays: T[],
  query: string
): T | null {
  const normalized = normalizeStayReferenceQuery(query);

  if (normalized.length < 6) {
    return null;
  }

  return stays.find((stay) => formatStayReference(stay.id) === normalized) ?? null;
}
