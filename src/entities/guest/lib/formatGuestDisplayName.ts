/** Build booking/profile display name from identity parts. */
export function formatGuestDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  fallback?: string | null
): string {
  const first = firstName?.trim() ?? '';
  const last = lastName?.trim() ?? '';
  const combined = [first, last].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  const fromFallback = fallback?.trim() ?? '';
  return fromFallback || 'Guest';
}
