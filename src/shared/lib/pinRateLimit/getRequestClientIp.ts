export function getRequestClientIp(headerStore: Headers): string {
  const forwarded = headerStore.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = headerStore.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}
