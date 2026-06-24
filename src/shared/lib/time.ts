const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeValue(value?: string | null): boolean {
  const trimmed = value?.trim();
  if (!trimmed) {
    return false;
  }

  return TIME_PATTERN.test(trimmed);
}

export function normalizeTimeValue(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return isValidTimeValue(trimmed) ? trimmed : undefined;
}
