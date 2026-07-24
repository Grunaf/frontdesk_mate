import type { GuestStayRecord } from '../model/types';
import { formatStayReference } from './formatStayReference';

export const BOOKING_SEARCH_RESULT_LIMIT = 8;

export function normalizeStayReferenceQuery(query: string): string {
  return query.replace(/#/g, '').replace(/\s+/g, '').trim().toUpperCase();
}

function normalizeNameQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

type BookingSearchStay = Pick<GuestStayRecord, 'id'> & {
  guest_name?: string | null;
  check_in_at?: string | null;
};

type MatchRank = 0 | 1 | 2 | 3;

/** Lower rank = better. exact ref → prefix ref → contains ref → name contains. */
function rankStayMatch(stay: BookingSearchStay, rawQuery: string): MatchRank | null {
  const refQuery = normalizeStayReferenceQuery(rawQuery);
  const nameQuery = normalizeNameQuery(rawQuery);
  const ref = formatStayReference(stay.id);

  if (refQuery.length > 0 && ref) {
    if (ref === refQuery) return 0;
    if (ref.startsWith(refQuery)) return 1;
    if (ref.includes(refQuery)) return 2;
  }

  if (nameQuery.length > 0) {
    const name = stay.guest_name?.trim().toLowerCase() ?? '';
    if (name.includes(nameQuery)) return 3;
  }

  return null;
}

function compareCheckIn(a: BookingSearchStay, b: BookingSearchStay): number {
  const aIn = a.check_in_at ?? '';
  const bIn = b.check_in_at ?? '';
  if (aIn !== bIn) return aIn < bIn ? -1 : 1;
  return (a.guest_name ?? '').localeCompare(b.guest_name ?? '');
}

/**
 * All partial matches by stay ref and/or guest name, best-first.
 * Empty / whitespace-only query → [].
 */
export function listStaysByBookingQuery<T extends BookingSearchStay>(
  stays: T[],
  query: string,
  limit: number = BOOKING_SEARCH_RESULT_LIMIT
): T[] {
  if (!query.trim()) return [];

  const ranked: { stay: T; rank: MatchRank }[] = [];
  for (const stay of stays) {
    const rank = rankStayMatch(stay, query);
    if (rank == null) continue;
    ranked.push({ stay, rank });
  }

  ranked.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return compareCheckIn(a.stay, b.stay);
  });

  const capped = limit > 0 ? ranked.slice(0, limit) : ranked;
  return capped.map((entry) => entry.stay);
}

/**
 * Best partial match by stay ref and/or guest name.
 * Empty / whitespace-only query → null.
 */
export function findStayByBookingQuery<T extends BookingSearchStay>(
  stays: T[],
  query: string
): T | null {
  return listStaysByBookingQuery(stays, query, 1)[0] ?? null;
}

/** @deprecated Prefer findStayByBookingQuery — kept for ref-only callers. */
export function findStayByReference<T extends BookingSearchStay>(
  stays: T[],
  query: string
): T | null {
  return findStayByBookingQuery(stays, query);
}
