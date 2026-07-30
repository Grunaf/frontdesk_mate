/** Whether the stay has a confirmed phone contact. */
export function isStayContactComplete(input: {
  contactPhone?: string | null;
  /** Soft fallback for stays that only filled tourism WhatsApp. */
  legacyTourismContactWhatsapp?: string | null;
}): boolean {
  if (input.contactPhone?.trim()) {
    return true;
  }

  return Boolean(input.legacyTourismContactWhatsapp?.trim());
}
