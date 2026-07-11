const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidRequestedDate(value: string): boolean {
  const trimmed = value.trim();
  if (!ISO_DATE_PATTERN.test(trimmed)) {
    return false;
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString().slice(0, 10) === trimmed;
}
