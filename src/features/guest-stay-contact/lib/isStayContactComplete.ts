/** Whether the guest provided a stay contact (new field or legacy tourism whatsapp). */
export function isStayContactComplete(input: {
  stayContactWhatsapp?: string | null;
  legacyTourismContactWhatsapp?: string | null;
}): boolean {
  const primary = input.stayContactWhatsapp?.trim();
  if (primary) {
    return true;
  }

  const legacy = input.legacyTourismContactWhatsapp?.trim();
  return Boolean(legacy);
}
