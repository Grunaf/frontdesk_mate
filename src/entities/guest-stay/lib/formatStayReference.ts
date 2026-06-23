const STAY_REF_LENGTH = 6;

export function formatStayReference(stayId: string): string | null {
  const normalized = stayId.replace(/-/g, '').trim();

  if (normalized.length < STAY_REF_LENGTH) {
    return null;
  }

  return normalized.slice(-STAY_REF_LENGTH).toUpperCase();
}
