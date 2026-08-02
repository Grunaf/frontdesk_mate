/**
 * Pure helpers mirrored by extensions/booking-com-sync/content.js DOM parsers.
 * Keep date / guest / amount parsing in sync when changing either side.
 */

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function toIsoDate(year: number, monthIndex: number, day: number): string | null {
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return null;
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** Parses "Sat, Aug 1, 2026" / "Aug 1, 2026" / "2026-08-01". */
export function parseBookingComExtranetDate(raw: string | null | undefined): string | null {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return null;
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const m = text.match(
    /(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+)?([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i
  );
  if (!m) return null;
  const monthIndex = MONTHS[m[1].toLowerCase()];
  if (monthIndex == null) return null;
  return toIsoDate(Number(m[3]), monthIndex, Number(m[2]));
}

export function parseBookingComGuestCounts(text: string | null | undefined): {
  adults: number | null;
  children: number | null;
} {
  const t = typeof text === 'string' ? text.trim().toLowerCase() : '';
  if (!t) return { adults: null, children: null };
  const adultsMatch = t.match(/(\d+)\s*adult/);
  const childrenMatch = t.match(/(\d+)\s*child/);
  const guestsOnly = t.match(/(\d+)\s*guest/);
  const bare = t.match(/^\d+$/);
  const adults = adultsMatch
    ? Number(adultsMatch[1])
    : guestsOnly
      ? Number(guestsOnly[1])
      : bare
        ? Number(bare[0])
        : null;
  const children = childrenMatch ? Number(childrenMatch[1]) : null;
  return {
    adults: Number.isFinite(adults) ? adults : null,
    children: Number.isFinite(children) ? children : null,
  };
}

export function parseBookingComAmountCurrency(text: string | null | undefined): {
  amount: number | null;
  currency: string | null;
} {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!t) return { amount: null, currency: null };
  const currencyMatch = t.match(/\b([A-Z]{3})\b/);
  const amountRaw = Number(t.replace(',', '.').replace(/[^\d.-]/g, ''));
  let currency = currencyMatch ? currencyMatch[1] : null;
  if (!currency && /€|eur\b/i.test(t)) currency = 'EUR';
  return {
    amount: Number.isFinite(amountRaw) ? amountRaw : null,
    currency,
  };
}

export function formatBookingComInboxContactLine(input: {
  phone_number: string | null;
  guest_email: string | null;
}): string {
  if (input.phone_number?.trim()) return input.phone_number.trim();
  if (input.guest_email?.trim()) return input.guest_email.trim();
  return 'No contact yet';
}
